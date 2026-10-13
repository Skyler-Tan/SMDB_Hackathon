package com.threer.repository;

import com.threer.model.ScannedItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ScannedItemRepository extends MongoRepository<ScannedItem, String> {
    List<ScannedItem> findByUserIdOrderByScannedAtDesc(String userId);
}