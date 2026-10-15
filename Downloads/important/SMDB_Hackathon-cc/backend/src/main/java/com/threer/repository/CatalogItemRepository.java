package com.threer.repository;

import com.threer.model.CatalogItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CatalogItemRepository extends MongoRepository<CatalogItem, String> {
    Optional<CatalogItem> findByCocoLabelsContainingIgnoreCase(String label);

    List<CatalogItem> findByMaterialIgnoreCase(String material);
}
