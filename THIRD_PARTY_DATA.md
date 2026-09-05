# Third-party data notices

ChemLab Studio's software is distributed under the repository's MIT license. Third-party scientific records retain their own terms and are not relicensed by the software license.

## NMRShiftDB proton peak-list derivatives

The six compact proton-NMR records in `src/data/orthogonalEvidenceScenarios.js` are derivatives of measured NMRShiftDB records accessed on 2026-08-30. NMRShiftDB states that its data use an extended version of the ODC Open Database License and that software built using the data must be open source in addition to the usual ODbL conditions.

ChemLab Studio stores only measured peak-list chemical shifts, source atom-reference counts used as displayed integration, reported multiplicity where available, source conditions, and record identifiers. Identical source shifts are merged. The repository does not redistribute raw CML, FID, measured intensity, line shape, phase, baseline, or noise.

| Compound | Spectrum ID | Molecule ID | Public source route |
|---|---:|---:|---|
| 1-Propanol | 10012286 | 10008030 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCCO/spectrumtype/1H` |
| 2-Propanol | 20197100 | 10016625 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CC%28O%29C/spectrumtype/1H` |
| Propanal | 31266 | 10016745 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCC%3DO/spectrumtype/1H` |
| Acetone | 31270 | 10007820 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CC%28%3DO%29C/spectrumtype/1H` |
| Ethyl acetate | 20099202 | 10008694 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCOC%28%3DO%29C/spectrumtype/1H` |
| Butanoic acid | 10012285 | 10008029 | `https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCCC%28%3DO%29O/spectrumtype/1H` |

NMRShiftDB documentation:

- Data and access policy: https://nmrshiftdb.nmr.uni-koeln.de/nmrshiftdbhtml/t1.html
- Automation interface and measured-versus-predicted ID rule: https://sourceforge.net/p/nmrshiftdb2/wiki/AutomationInterfaces/
- Data licensing notice: https://sourceforge.net/p/nmrshiftdb2/blog/

## NIST isotope masses and compositions

The ideal isotopologue-envelope engine freezes selected H, C, O, Cl, and Br relative isotope masses and natural compositions from the NIST Physical Measurement Laboratory's Atomic Weights and Isotopic Compositions tables:

https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ascii=ascii&isotype=all

These constants generate a local ideal natural-abundance molecular-ion envelope. No NIST mass spectrum is copied or reconstructed. Several NIST Chemistry WebBook mass-spectrum pages explicitly prohibit downloading their displayed spectra, so those records are intentionally excluded.

## Existing transformed NIST infrared traces

The separately documented infrared teaching traces remain modified derivatives of downloadable NIST Chemistry WebBook JCAMP records. Their source URLs, owner/origin metadata, transformation notice, and NIST licensing link are displayed in the Infrared Evidence Studio and documented in `README.md`.
