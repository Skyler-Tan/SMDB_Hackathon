package com.threer.repository;

import com.threer.model.ScannedItem;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ScannedItemRepository extends MongoRepository<ScannedItem, String> {
}