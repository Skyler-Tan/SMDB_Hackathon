package com.threer.service;

import com.threer.model.ScannedItem;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Calculates a recyclability condition score (0–100) for a scanned item
 * using only data that is already available after the scan + recycling
 * check — no extra AI or web calls are made.
 *
 * ── Scoring breakdown (max 100) ───────────────────────────────────────
 *
 *  Component                           Max   Notes
 *  ─────────────────────────────────── ───   ────────────────────────────
 *  AI identification confidence         35   confidence × 35
 *  Known recyclable material type       20   plastic/glass/metal/paper
 *  Recycling status verdict             25   RECYCLABLE / NOT_RECYCLABLE
 *  Bin specificity                      15   named bin vs "unknown"/"other"
 *  Identification confirmed by user      5   auto or manually confirmed
 *  ─────────────────────────────────── ───
 *  TOTAL                               100
 *
 * ── Labels ────────────────────────────────────────────────────────────
 *
 *  Score    Label
 *  ──────   ──────────────────────
 *  80–100   Excellent condition
 *  60– 79   Good condition
 *  40– 59   Fair condition
 *  20– 39   Poor condition
 *   0– 19   Not recyclable / unverified
 */
@Service
public class ConditionService {

    public ConditionResult evaluate(ScannedItem item) {
        int score = 0;
        List<String> tips = new ArrayList<>();

        // ── 1. AI confidence (0–35 pts) ───────────────────────────────
        double confidence = clamp(item.getConfidence());
        int confidencePts = (int) Math.round(confidence * 35);
        score += confidencePts;

        if (confidence < 0.5) {
            tips.add("The AI was not confident about this item. "
                    + "Try scanning again with better lighting.");
        } else if (confidence < 0.8) {
            tips.add("AI confidence is moderate. "
                    + "Confirm the item type for a more accurate result.");
        }

        // ── 2. Known recyclable material (0 or 20 pts) ───────────────
        String material = normalize(item.getMaterial());
        boolean knownMaterial = material.contains("plastic")
                || material.contains("glass")
                || material.contains("paper")
                || material.contains("cardboard")
                || material.contains("metal")
                || material.contains("aluminium")
                || material.contains("aluminum");

        if (knownMaterial) {
            score += 20;
        } else {
            tips.add("Material type is unknown or unsupported. "
                    + "Check the item's label for a material code.");
        }

        // ── 3. Recycling status verdict (−20 to +25 pts) ─────────────
        String status = item.getRecyclingStatus();
        if ("RECYCLABLE".equals(status)) {
            score += 25;
        } else if ("NOT_RECYCLABLE".equals(status)) {
            score -= 20;
            tips.add("This item has been identified as non-recyclable in "
                    + "a standard household bin. Consider specialist drop-off points.");
        } else {
            // UNVERIFIED — partial credit, no deduction
            tips.add("Recycling status could not be confirmed. "
                    + "Check with your local recycling provider.");
        }

        // ── 4. Bin specificity (0 or 15 pts) ─────────────────────────
        String bin = normalize(item.getBin());
        boolean specificBin = !bin.isBlank()
                && !bin.equals("unknown")
                && !bin.equals("other");

        if (specificBin) {
            score += 15;
        } else {
            tips.add("No specific bin has been assigned. "
                    + "Look for the correct bin type at your local centre.");
        }

        // ── 5. Identification confirmed (0 or 5 pts) ─────────────────
        if (item.isIdentificationConfirmed()) {
            score += 5;
        } else {
            tips.add("Confirm the identified item to improve accuracy.");
        }

        // ── Clamp, label, and return ──────────────────────────────────
        score = Math.max(0, Math.min(100, score));
        String label = toLabel(score, status);

        return new ConditionResult(score, label, tips);
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private String toLabel(int score, String status) {
        if ("NOT_RECYCLABLE".equals(status)) {
            return "Not recyclable";
        }
        if (score >= 80) return "Excellent condition";
        if (score >= 60) return "Good condition";
        if (score >= 40) return "Fair condition";
        if (score >= 20) return "Poor condition";
        return "Unverified";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    // ── Result record ─────────────────────────────────────────────────────────

    public record ConditionResult(
            int score,
            String label,
            List<String> tips
    ) {}
}
