# GreenVox Paper Framework

## Working Title

**GreenVox: Integrating Sentinel-2 Vegetation Change Detection and Student Citizen Science for School-Centered Community Green Monitoring in Jakarta**

## Central Research Question

**How can Sentinel-2-derived vegetation change indicators and student citizen-science observations be integrated through a WebGIS to support school-centered community green monitoring in Jakarta?**

## Study Area

- Anchor: SMP Islam Al-Azhar 19 Cibubur
- Community AOI: 250 m radius
- Area: 19.4004 ha
- Common valid historical comparison area: 19.3157 ha

## Satellite Method

- Dataset: Sentinel-2 Surface Reflectance Harmonized
- Platform: Google Earth Engine
- Seasonal window: June 1–August 23
- Years compared: 2022 and 2026
- NDVI: `(B8 - B4) / (B8 + B4)`
- Seasonal median composite
- Common-valid-pixel comparison
- Working vegetation threshold: NDVI ≥ 0.35
- Working change threshold: ±0.05

## Verified Results

| Indicator | 2022 | 2026 |
|---|---:|---:|
| Mean NDVI | 0.3959 | 0.3089 |
| Median NDVI | 0.3654 | 0.2602 |
| Pixels NDVI ≥ 0.35 | 51.96% | 39.10% |

Historical screening:

- Mean NDVI change: -0.0870
- Relative mean NDVI change from 2022 baseline: -21.97%
- Decreased signal: 53.74%
- Relatively stable: 38.17%
- Increased signal: 8.10%

## Proposed Research Design

### Phase 1 — Remote sensing
Measure historical vegetation-signal change.

### Phase 2 — WebGIS translation
Present the results in an interface that can be understood without specialist GIS software.

### Phase 3 — Citizen-science field verification
Collect anonymous ground observations at selected locations.

### Phase 4 — Interpretation
Compare satellite screening with field categories and notes.

### Phase 5 — Community action and future monitoring
Only after ground verification, identify reasonable protection, maintenance, shade, or greening actions and monitor the area again later.

## Paper Structure

1. Abstract
2. Introduction
3. Literature Review
   - urban greening and school-centered environmental participation
   - Sentinel-2 and NDVI
   - remote sensing for urban vegetation
   - citizen science
   - WebGIS and environmental decision support
4. Materials and Methods
5. Results
6. Discussion
7. Social and Environmental Implications
8. Limitations
9. Conclusion
10. References

## Important Interpretation Rules

Do not write “vegetation decreased by 21.97%.”

Use:

**“Mean NDVI in the 2026 seasonal composite was approximately 21.97% lower relative to the 2022 baseline.”**

Do not write “53.74% of vegetation disappeared.”

Use:

**“53.74% of the common valid comparison area exhibited an NDVI decrease greater than the operational change threshold of 0.05.”**

## Literature Still Needed

Before submission, add verified academic references for:
- NDVI theory and limitations;
- Sentinel-2 urban vegetation monitoring;
- temporal comparability / cloud masking / median compositing;
- citizen science environmental monitoring;
- student and school-based citizen science;
- WebGIS environmental decision support;
- urban green-space monitoring in tropical cities / Jakarta where available.
