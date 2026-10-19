package com.threer.service;

import org.springframework.stereotype.Service;

@Service
public class ImpactService {

    public ImpactResult calculate(
            String material,
            String container) {

        String normalizedMaterial =
                material == null
                        ? "unknown"
                        : material.toLowerCase();

        String normalizedContainer =
                container == null
                        ? "unknown"
                        : container.toLowerCase();

        /*
         * Initial application estimates.
         *
         * These are intentionally kept in one place so they can
         * be replaced with researched environmental factors later.
         */

        if (normalizedMaterial.contains("paper")
                || normalizedMaterial.contains("cardboard")) {

            return new ImpactResult(
                    0.4,
                    0.02,
                    8.0,
                    2,
                    "paper"
            );
        }

        if (normalizedMaterial.contains("plastic")) {

            double grams = 10.0;

            if (normalizedContainer.contains("bottle")) {
                grams = 20.0;
            } else if (normalizedContainer.contains("bag")) {
                grams = 5.0;
            } else if (normalizedContainer.contains("container")) {
                grams = 15.0;
            }

            return new ImpactResult(
                    1.0,
                    0.05,
                    grams,
                    3,
                    "plastic"
            );
        }

        if (normalizedMaterial.contains("glass")) {

            return new ImpactResult(
                    2.0,
                    0.10,
                    250.0,
                    5,
                    "glass"
            );
        }

        if (normalizedMaterial.contains("metal")
                || normalizedMaterial.contains("aluminium")
                || normalizedMaterial.contains("aluminum")) {

            return new ImpactResult(
                    3.0,
                    0.15,
                    20.0,
                    5,
                    "metal"
            );
        }

        /*
         * Unknown material.
         *
         * We don't want to invent a large environmental benefit.
         */

        return new ImpactResult(
                0.0,
                0.0,
                0.0,
                0,
                material == null
                        ? "unknown"
                        : material
        );
    }

    public record ImpactResult(
            double waterLiters,
            double co2Kg,
            double materialGrams,
            int rewardPoints,
            String materialLabel
    ) {
    }
}