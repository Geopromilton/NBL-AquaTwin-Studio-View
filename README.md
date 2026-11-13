# NBL-AquaTwin Studio (view-only)

A browser copy of the NBL-AquaTwin Studio, version 1.18.0, for the Siddanahalli site (Malur Taluk, Kolar District, Karnataka). It shows every step of the studio as it appears on the PC, using results recorded on 13 November 2026 from saved run `SID-20261019-104700`.

Open the site: https://geopromilton.github.io/NBL-AquaTwin-Studio-View/

## What works

- All eight steps: Site setup, Data integrity, Quality control, Pseudo-sections, Interpretation, Assumptions, Run & scenarios, Reports & decisions.
- Every tab, reading, scenario, boundary and option switch that has a recorded result.
- The three water-plan tabs under Run & scenarios, Storm & storage plan: Net zero plan, Risk calendar and drought, Closed loop and NEWater. They open with the default inputs, and the one-storm and season-of-storms views open with their recorded options.
- Depth slices, survey lines, the 3D model, outcome maps, cloudburst tiers, the decision log and the report figures.

## What does not work

Nothing is calculated in the browser. The Calculate, Start, Download, Save, Prepare report and AquaTwin AI controls are hidden, and number inputs are read-only. To change an input or run a calculation, use the studio on the PC.

## Status of the numbers

These results are for a pre-drilling, assumption-driven scenario. No borewell has been test-pumped yet, so borewell yields and infiltration are placeholders until measured on site. From version 1.18.0 the studio supplies pure (filtered) water only; the concentrate, the unused treated wastewater and the sludge leave daily by tanker, and the Closed loop tab shows the five-year build-up (20 % more occupied each year). Tanker size, cost per trip and sludge amount are placeholders and may change.

## How it was made

The studio's own pages run unchanged. `assets/replay.js` answers each call the page makes to its server from `data/rec.json`, a recording of the real studio. The recording and the page code are static files, so the site needs no server.

Prepared by Dr. A. Antony Alosanai Promilton, Hydrogeologist, Vijayanagar Eco-Village Pvt Ltd (Nature Based Living).
