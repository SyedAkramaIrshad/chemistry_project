const LN_2 = Math.LN2;
const SPECTRUM_MIN_NM = 380;
const SPECTRUM_MAX_NM = 720;
const STANDARD_COUNT = 6;

const MODEL_ASSUMPTIONS = [
  'The displayed absorption band is an illustrative Gaussian function, not a measured molecular spectrum.',
  'Each standard is homogeneous and follows A = epsilon b c before the optional instrument response is applied.',
  'The selected radiation is treated as monochromatic relative to the illustrative band width.',
  'The calibration line is an unconstrained ordinary least-squares fit to all six simulated standards.',
  'The optional stray-light fraction is unabsorbed and follows the displayed NIST-derived response equation.',
];

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function boundedNumber(value, label, minimum, maximum) {
  const number = finiteNumber(value, label);
  if (number < minimum || number > maximum) {
    throw new RangeError(`${label} must stay between ${minimum} and ${maximum}.`);
  }
  return number;
}

function positiveNumber(value, label, maximum = Infinity) {
  const number = finiteNumber(value, label);
  if (number <= 0 || number > maximum) {
    throw new RangeError(`${label} must be greater than zero${Number.isFinite(maximum) ? ` and no more than ${maximum}` : ''}.`);
  }
  return number;
}

function normalizeParams(params) {
  if (!params || typeof params !== 'object') throw new TypeError('Spectrophotometry parameters are required.');
  return {
    lambdaMaxNm: boundedNumber(params.lambdaMaxNm, 'Band maximum wavelength', 400, 680),
    bandWidthNm: positiveNumber(params.bandWidthNm, 'Band full width at half maximum', 240),
    epsilonMax: positiveNumber(params.epsilonMax, 'Maximum molar absorption coefficient', 100000),
    pathLengthCm: positiveNumber(params.pathLengthCm, 'Optical path length', 10),
    measurementWavelengthNm: boundedNumber(params.measurementWavelengthNm, 'Measurement wavelength', SPECTRUM_MIN_NM, SPECTRUM_MAX_NM),
    maxStandardMicroM: positiveNumber(params.maxStandardMicroM, 'Maximum standard concentration', 1000),
    unknownMicroM: boundedNumber(params.unknownMicroM, 'Simulated unknown concentration', 0, 1500),
    strayLightPercent: boundedNumber(params.strayLightPercent, 'Unabsorbed stray light', 0, 3),
  };
}

export function molarAbsorptivityAt(wavelengthNm, band) {
  const wavelength = finiteNumber(wavelengthNm, 'Wavelength');
  if (!band || typeof band !== 'object') throw new TypeError('Band parameters are required.');
  const lambdaMaxNm = finiteNumber(band.lambdaMaxNm, 'Band maximum wavelength');
  const bandWidthNm = positiveNumber(band.bandWidthNm, 'Band full width at half maximum');
  const epsilonMax = positiveNumber(band.epsilonMax, 'Maximum molar absorption coefficient');
  const displacement = (wavelength - lambdaMaxNm) / bandWidthNm;
  return epsilonMax * Math.exp(-4 * LN_2 * displacement * displacement);
}

export function applyUnabsorbedStrayLight(trueAbsorbance, strayLightPercent = 0) {
  const absorbance = boundedNumber(trueAbsorbance, 'True absorbance', 0, 50);
  const strayPercent = boundedNumber(strayLightPercent, 'Unabsorbed stray light', 0, 3);
  const strayFraction = strayPercent / 100;
  const trueTransmittance = 10 ** (-absorbance);
  const observedTransmittance = trueTransmittance + strayFraction * (1 - trueTransmittance);
  const observedAbsorbance = -Math.log10(observedTransmittance);
  return {
    trueAbsorbance: absorbance,
    trueTransmittance,
    observedTransmittance,
    observedAbsorbance,
    strayFraction,
  };
}

export function linearRegression(points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new RangeError('Linear regression requires at least three points.');
  }
  const normalized = points.map((point, index) => {
    if (!point || typeof point !== 'object') throw new TypeError(`Calibration point ${index + 1} is required.`);
    return {
      x: finiteNumber(point.x, `Calibration point ${index + 1} concentration`),
      y: finiteNumber(point.y, `Calibration point ${index + 1} response`),
    };
  });
  const count = normalized.length;
  const meanX = normalized.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = normalized.reduce((sum, point) => sum + point.y, 0) / count;
  const sxx = normalized.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (sxx <= Number.EPSILON) throw new RangeError('Calibration concentrations must not all be identical.');
  const sxy = normalized.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = normalized.map((point) => {
    const predicted = intercept + slope * point.x;
    return {...point, predicted, residual: point.y - predicted};
  });
  const sse = residuals.reduce((sum, point) => sum + point.residual ** 2, 0);
  const sst = normalized.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const rSquared = sst <= Number.EPSILON ? 1 : 1 - sse / sst;
  const residualStandardDeviation = Math.sqrt(sse / (count - 2));
  return {
    count,
    slope,
    intercept,
    meanX,
    meanY,
    sxx,
    sse,
    sst,
    rSquared,
    residualStandardDeviation,
    residuals,
  };
}

function sampleAtConcentration(concentrationMicroM, epsilon, params) {
  const concentrationM = concentrationMicroM * 1e-6;
  const trueAbsorbance = epsilon * params.pathLengthCm * concentrationM;
  return {
    concentrationMicroM,
    concentrationM,
    ...applyUnabsorbedStrayLight(trueAbsorbance, params.strayLightPercent),
  };
}

function sensitivityLabel(relativeSensitivity) {
  if (relativeSensitivity >= 0.8) return 'Near the band maximum: high relative sensitivity';
  if (relativeSensitivity >= 0.2) return 'Off peak: the calibration is less sensitive';
  return 'Far from the band maximum: sensitivity is very low';
}

function curvatureLabel(maxBeerDeviation, maximumResidual, strayLightPercent) {
  if (strayLightPercent === 0) return 'Ideal Beer-Lambert response is linear over the selected range';
  if (maxBeerDeviation >= 0.05 || maximumResidual >= 0.01) return 'Systematic high-absorbance compression is visible';
  return 'Stray light is present, but curvature is subtle over this range';
}

export function analyzeSpectrophotometry(params) {
  const normalized = normalizeParams(params);
  const band = {
    lambdaMaxNm: normalized.lambdaMaxNm,
    bandWidthNm: normalized.bandWidthNm,
    epsilonMax: normalized.epsilonMax,
  };
  const selectedEpsilon = molarAbsorptivityAt(normalized.measurementWavelengthNm, band);
  const relativeSensitivity = selectedEpsilon / normalized.epsilonMax;
  const standardConcentrations = Array.from({length: STANDARD_COUNT}, (_, index) => (
    normalized.maxStandardMicroM * index / (STANDARD_COUNT - 1)
  ));
  const standards = standardConcentrations.map((concentrationMicroM) => (
    sampleAtConcentration(concentrationMicroM, selectedEpsilon, normalized)
  ));
  const regression = linearRegression(standards.map((point) => ({
    x: point.concentrationMicroM,
    y: point.observedAbsorbance,
  })));
  const standardsWithFit = standards.map((point, index) => ({
    ...point,
    predictedAbsorbance: regression.residuals[index].predicted,
    residual: regression.residuals[index].residual,
  }));
  const unknown = sampleAtConcentration(normalized.unknownMicroM, selectedEpsilon, normalized);
  const estimatedMicroM = (unknown.observedAbsorbance - regression.intercept) / regression.slope;
  const recoveryPercent = normalized.unknownMicroM > 0 ? estimatedMicroM / normalized.unknownMicroM * 100 : null;
  const isExtrapolated = normalized.unknownMicroM > normalized.maxStandardMicroM;
  const maximumResidual = Math.max(...standardsWithFit.map((point) => Math.abs(point.residual)));
  const maxBeerDeviation = Math.max(...standardsWithFit.map((point) => point.trueAbsorbance - point.observedAbsorbance));
  const spectrum = Array.from({length: 161}, (_, index) => {
    const wavelengthNm = SPECTRUM_MIN_NM + (SPECTRUM_MAX_NM - SPECTRUM_MIN_NM) * index / 160;
    const epsilon = molarAbsorptivityAt(wavelengthNm, band);
    return {wavelengthNm, epsilon, relativeEpsilon: epsilon / normalized.epsilonMax};
  });
  const responseCurve = Array.from({length: 121}, (_, index) => {
    const concentrationMicroM = normalized.maxStandardMicroM * index / 120;
    return sampleAtConcentration(concentrationMicroM, selectedEpsilon, normalized);
  });
  const fitLine = [0, normalized.maxStandardMicroM].map((concentrationMicroM) => ({
    concentrationMicroM,
    absorbance: regression.intercept + regression.slope * concentrationMicroM,
  }));

  return {
    status: 'valid',
    resultKind: 'Computed illustrative spectrophotometer output — not measured data',
    params: normalized,
    band: {
      ...band,
      selectedEpsilon,
      relativeSensitivity,
      spectrum,
      sensitivityLabel: sensitivityLabel(relativeSensitivity),
    },
    calibration: {
      standards: standardsWithFit,
      responseCurve,
      fitLine,
      regression,
      maximumResidual,
      maxBeerDeviation,
      curvatureLabel: curvatureLabel(maxBeerDeviation, maximumResidual, normalized.strayLightPercent),
      equation: {
        label: 'Beer-Lambert calibration and unconstrained OLS',
        expression: 'A = epsilon b c;  A_fit = intercept + slope c',
        detail: 'Sensitivity is the fitted slope for the displayed concentration units.',
      },
    },
    unknown: {
      ...unknown,
      trueMicroM: normalized.unknownMicroM,
      estimatedMicroM,
      recoveryPercent,
      isExtrapolated,
      rangeLabel: isExtrapolated
        ? 'Extrapolated beyond the highest standard'
        : 'Interpolated inside the calibration range',
    },
    optics: {
      selectedWavelengthNm: normalized.measurementWavelengthNm,
      unknownTrueTransmittance: unknown.trueTransmittance,
      unknownObservedTransmittance: unknown.observedTransmittance,
      equation: {
        label: 'Unabsorbed stray-light response',
        expression: 'Aobs = -log10[T + S(1 - T)];  T = 10^(-Atrue)',
        detail: 'Set S to zero for the ideal instrument mode.',
      },
    },
    diagnostics: {
      sensitivityLabel: sensitivityLabel(relativeSensitivity),
      curvatureLabel: curvatureLabel(maxBeerDeviation, maximumResidual, normalized.strayLightPercent),
      extrapolationLabel: isExtrapolated
        ? 'The unknown is outside the standard range; the line is being extrapolated.'
        : 'The unknown lies inside the standard range.',
    },
    assumptions: MODEL_ASSUMPTIONS,
  };
}

export const SPECTROPHOTOMETRY_CONSTANTS = {
  spectrumMinimumNm: SPECTRUM_MIN_NM,
  spectrumMaximumNm: SPECTRUM_MAX_NM,
  standardCount: STANDARD_COUNT,
  assumptions: MODEL_ASSUMPTIONS,
};
