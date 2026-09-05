import assert from 'node:assert/strict';
import {
  analyzeSpectrophotometry,
  applyUnabsorbedStrayLight,
  linearRegression,
  molarAbsorptivityAt,
} from '../src/chemistry/spectrophotometry.js';

const base = {
  lambdaMaxNm: 520,
  bandWidthNm: 80,
  epsilonMax: 18000,
  pathLengthCm: 1,
  measurementWavelengthNm: 520,
  maxStandardMicroM: 80,
  unknownMicroM: 35,
  strayLightPercent: 0,
};

const band = {lambdaMaxNm:520,bandWidthNm:80,epsilonMax:18000};
assert.ok(Math.abs(molarAbsorptivityAt(520,band)-18000)<1e-10);
assert.ok(Math.abs(molarAbsorptivityAt(480,band)-9000)<1e-10);
assert.ok(Math.abs(molarAbsorptivityAt(560,band)-9000)<1e-10);
assert.ok(Math.abs(molarAbsorptivityAt(600,band)-1125)<1e-10);

const ideal = analyzeSpectrophotometry(base);
const doublePath = analyzeSpectrophotometry({...base,pathLengthCm:2});
const offPeak = analyzeSpectrophotometry({...base,measurementWavelengthNm:600});
const stray = analyzeSpectrophotometry({...base,epsilonMax:24000,maxStandardMicroM:100,unknownMicroM:45,strayLightPercent:1});
const extrapolated = analyzeSpectrophotometry({...base,unknownMicroM:120});

assert.equal(ideal.status,'valid');
assert.equal(ideal.calibration.standards.length,6);
assert.equal(ideal.band.spectrum.length,161);
assert.equal(ideal.calibration.responseCurve.length,121);
assert.ok(Math.abs(ideal.calibration.regression.slope-0.018)<1e-12);
assert.ok(Math.abs(ideal.calibration.regression.intercept)<1e-12);
assert.ok(Math.abs(ideal.calibration.regression.rSquared-1)<1e-12);
assert.ok(Math.abs(ideal.unknown.estimatedMicroM-35)<1e-10);
assert.ok(Math.abs(ideal.unknown.recoveryPercent-100)<1e-10);
assert.ok(Math.abs(doublePath.calibration.regression.slope/ideal.calibration.regression.slope-2)<1e-12);
assert.ok(Math.abs(offPeak.calibration.regression.slope/ideal.calibration.regression.slope-1/16)<1e-12);
assert.ok(stray.calibration.maxBeerDeviation>0.5);
assert.ok(stray.calibration.standards.at(-1).observedAbsorbance<stray.calibration.standards.at(-1).trueAbsorbance);
assert.ok(stray.calibration.maximumResidual>0.01);
assert.match(stray.calibration.curvatureLabel,/compression/);
assert.equal(extrapolated.unknown.isExtrapolated,true);
assert.match(extrapolated.unknown.rangeLabel,/Extrapolated/);

for(const analysis of [ideal,doublePath,offPeak,stray,extrapolated]){
  for(const point of analysis.calibration.standards){
    assert.ok(point.trueTransmittance>=0&&point.trueTransmittance<=1);
    assert.ok(point.observedTransmittance>=0&&point.observedTransmittance<=1);
  }
  const residualSum=analysis.calibration.regression.residuals.reduce((sum,point)=>sum+point.residual,0);
  assert.ok(Math.abs(residualSum)<1e-10);
}

const onePercent = applyUnabsorbedStrayLight(2,1);
assert.ok(Math.abs(onePercent.observedAbsorbance-1.7011469235902937)<1e-12);
assert.throws(()=>analyzeSpectrophotometry({...base,measurementWavelengthNm:900}),/between 380 and 720/);
assert.throws(()=>analyzeSpectrophotometry({...base,pathLengthCm:0}),/greater than zero/);
assert.throws(()=>analyzeSpectrophotometry({...base,strayLightPercent:-1}),/between 0 and 3/);
assert.throws(()=>linearRegression([{x:1,y:1},{x:1,y:2},{x:1,y:3}]),/must not all be identical/);

console.log(`peak: epsilon ${ideal.band.selectedEpsilon.toFixed(0)} M^-1 cm^-1, slope ${ideal.calibration.regression.slope.toFixed(6)} A per microM`);
console.log(`one FWHM off peak: slope ${offPeak.calibration.regression.slope.toFixed(7)} A per microM (${(offPeak.band.relativeSensitivity*100).toFixed(2)}% sensitivity)`);
console.log(`ideal unknown: ${ideal.unknown.estimatedMicroM.toFixed(3)} microM, recovery ${ideal.unknown.recoveryPercent.toFixed(2)}%`);
console.log(`1% stray light: high-standard Atrue ${stray.calibration.standards.at(-1).trueAbsorbance.toFixed(3)}, Aobs ${stray.calibration.standards.at(-1).observedAbsorbance.toFixed(3)}, R2 ${stray.calibration.regression.rSquared.toFixed(6)}`);
console.log('Beer-Lambert scaling, spectral width, OLS residuals, stray-light compression, extrapolation, and invalid inputs verified.');
