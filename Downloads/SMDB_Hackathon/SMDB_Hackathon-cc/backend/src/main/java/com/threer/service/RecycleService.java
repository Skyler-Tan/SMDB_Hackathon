package com.threer.service;

import com.threer.dto.RecycleRequest;
import com.threer.dto.RecycleResultResponse;
import com.threer.dto.StatsResponse;
import com.threer.model.RecycleEvent;
import com.threer.model.ScannedItem;
import com.threer.model.UserProfile;
import com.threer.repository.RecycleEventRepository;
import com.threer.repository.ScannedItemRepository;
import com.threer.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RecycleService {

    private final ScannedItemRepository scannedItemRepository;
    private final RecycleEventRepository recycleEventRepository;
    private final UserProfileRepository userProfileRepository;
    private final ImpactService impactService;
    private final String defaultUserId;

    public RecycleService(
            ScannedItemRepository scannedItemRepository,
            RecycleEventRepository recycleEventRepository,
            UserProfileRepository userProfileRepository,
            ImpactService impactService,
            @Value("${threer.default-user-id}") String defaultUserId) {

        this.scannedItemRepository =
                scannedItemRepository;

        this.recycleEventRepository =
                recycleEventRepository;

        this.userProfileRepository =
                userProfileRepository;

        this.impactService =
                impactService;

        this.defaultUserId =
                defaultUserId;
    }

    public RecycleResultResponse recycle(
            RecycleRequest request) {

        /*
         * Validate quantity.
         */

        if (request.getQuantity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity must be at least 1"
            );
        }

        /*
         * Find the AI-scanned item.
         */

        ScannedItem item =
                scannedItemRepository
                        .findById(request.getItemId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Unknown scanned item"
                                )
                        );

        /*
         * Do not allow recycling something that the
         * verification system marked as non-recyclable.
         */

        if (!item.isRecyclable()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This item is not recyclable in a household bin"
            );
        }

        String userId =
                (request.getUserId() == null ||
                        request.getUserId().isBlank())
                        ? defaultUserId
                        : request.getUserId();

        int qty =
                request.getQuantity();

        /*
         * Recalculate the impact from the scanned item's
         * material and container.
         *
         * This prevents the frontend from deciding how
         * many points or environmental benefits the user gets.
         */

        ImpactService.ImpactResult impact =
                impactService.calculate(
                        item.getMaterial(),
                        item.getContainer()
                );

        /*
         * Calculate totals for this recycling action.
         */

        double waterLiters =
                round(
                        impact.waterLiters()
                                * qty
                );

        double co2Kg =
                round(
                        impact.co2Kg()
                                * qty
                );

        double materialGrams =
                round(
                        impact.materialGrams()
                                * qty
                );

        int points =
                impact.rewardPoints()
                        * qty;

        /*
         * Create recycle event.
         */

        RecycleEvent event =
                new RecycleEvent();

        event.setUserId(
                userId
        );

        event.setItemId(
                item.getId()
        );

        event.setItemName(
                item.getName()
        );

        event.setMaterial(
                item.getMaterial()
        );

        event.setBin(
                item.getBin()
        );

        event.setQuantity(
                qty
        );

        event.setWaterLiters(
                waterLiters
        );

        event.setCo2Kg(
                co2Kg
        );

        event.setMaterialGrams(
                materialGrams
        );

        event.setPointsEarned(
                points
        );

        event.setCreatedAt(
                Instant.now()
        );

        recycleEventRepository.save(
                event
        );

        /*
         * Load or create user profile.
         */

        UserProfile user =
                userProfileRepository
                        .findById(userId)
                        .orElseGet(() -> {

                            UserProfile created =
                                    new UserProfile();

                            created.setId(
                                    userId
                            );

                            return created;
                        });

        /*
         * Remember badges before updating the user.
         */

        List<String> before =
                new ArrayList<>(
                        user.getBadges()
                );

        /*
         * Update user totals.
         */

        user.setItemsRecycled(
                user.getItemsRecycled()
                        + qty
        );

        user.setWaterLiters(
                round(
                        user.getWaterLiters()
                                + waterLiters
                )
        );

        user.setCo2Kg(
                round(
                        user.getCo2Kg()
                                + co2Kg
                )
        );

        user.setMaterialGrams(
                round(
                        user.getMaterialGrams()
                                + materialGrams
                )
        );

        user.setPoints(
                user.getPoints()
                        + points
        );

        /*
         * Apply badges.
         */

        applyBadges(
                user
        );

        userProfileRepository.save(
                user
        );

        /*
         * Find newly earned badges.
         */

        List<String> newBadges =
                user.getBadges()
                        .stream()
                        .filter(
                                badge ->
                                        !before.contains(badge)
                        )
                        .toList();

        /*
         * Build response.
         */

        RecycleResultResponse response =
                new RecycleResultResponse();

        response.setQuantity(
                qty
        );

        response.setItemName(
                item.getName()
        );

        response.setWaterLitersThisTurn(
                waterLiters
        );

        response.setCo2KgThisTurn(
                co2Kg
        );

        response.setMaterialGramsThisTurn(
                materialGrams
        );

        response.setMaterialLabel(
                impact.materialLabel()
        );

        response.setPointsThisTurn(
                points
        );

        response.setNewBadges(
                newBadges
        );

        response.setTotals(
                toStats(user)
        );

        return response;
    }

    public StatsResponse stats(
            String userId) {

        String id =
                (userId == null ||
                        userId.isBlank())
                        ? defaultUserId
                        : userId;

        UserProfile user =
                userProfileRepository
                        .findById(id)
                        .orElseGet(() -> {

                            UserProfile created =
                                    new UserProfile();

                            created.setId(id);

                            return created;
                        });

        StatsResponse stats =
                toStats(user);

        Map<String, Long> counts =
                new LinkedHashMap<>();

        recycleEventRepository
                .findByUserIdOrderByCreatedAtDesc(id)
                .forEach(event ->
                        counts.merge(
                                event.getMaterial(),
                                (long) event.getQuantity(),
                                Long::sum
                        )
                );

        stats.setByMaterial(
                counts.entrySet()
                        .stream()
                        .map(
                                e ->
                                        new StatsResponse.MaterialCount(
                                                e.getKey(),
                                                e.getValue()
                                        )
                        )
                        .toList()
        );

        return stats;
    }

    public List<RecycleEvent> history(
            String userId) {

        String id =
                (userId == null ||
                        userId.isBlank())
                        ? defaultUserId
                        : userId;

        return recycleEventRepository
                .findByUserIdOrderByCreatedAtDesc(id);
    }

    private void applyBadges(
            UserProfile user) {

        addBadge(
                user,
                "First recycle",
                user.getItemsRecycled() >= 1
        );

        long plasticCount =
                recycleEventRepository
                        .findByUserIdOrderByCreatedAtDesc(
                                user.getId()
                        )
                        .stream()
                        .filter(
                                event ->
                                        "plastic"
                                                .equalsIgnoreCase(
                                                        event.getMaterial()
                                                )
                        )
                        .mapToLong(
                                RecycleEvent::getQuantity
                        )
                        .sum();

        addBadge(
                user,
                "Plastic trio",
                plasticCount >= 3
        );

        addBadge(
                user,
                "Water saver",
                user.getWaterLiters() >= 10
        );

        addBadge(
                user,
                "Climate friend",
                user.getCo2Kg() >= 1
        );

        addBadge(
                user,
                "Bin champion",
                user.getItemsRecycled() >= 10
        );

        addBadge(
                user,
                "Point collector",
                user.getPoints() >= 100
        );
    }

    private void addBadge(
            UserProfile user,
            String badge,
            boolean earned) {

        if (earned &&
                !user.getBadges().contains(badge)) {

            user.getBadges().add(
                    badge
            );
        }
    }

    private StatsResponse toStats(
            UserProfile user) {

        StatsResponse stats =
                new StatsResponse();

        stats.setPoints(
                user.getPoints()
        );

        stats.setItemsRecycled(
                user.getItemsRecycled()
        );

        stats.setWaterLiters(
                round(
                        user.getWaterLiters()
                )
        );

        stats.setCo2Kg(
                round(
                        user.getCo2Kg()
                )
        );

        stats.setMaterialGrams(
                round(
                        user.getMaterialGrams()
                )
        );

        stats.setBadges(
                user.getBadges()
        );

        return stats;
    }

    private double round(
            double value) {

        return Math.round(
                value * 1000.0
        ) / 1000.0;
    }
}