package com.threer.repository;

import com.threer.model.RecycleEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RecycleEventRepository extends MongoRepository<RecycleEvent, String> {
    List<RecycleEvent> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndMaterialIgnoreCase(String userId, String material);
}
