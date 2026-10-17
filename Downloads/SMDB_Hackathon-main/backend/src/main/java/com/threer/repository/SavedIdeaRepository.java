package com.threer.repository;

import com.threer.model.SavedIdea;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SavedIdeaRepository extends MongoRepository<SavedIdea, String> {

    List<SavedIdea> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<SavedIdea> findByUserIdAndIdeaKey(String userId, String ideaKey);

    Optional<SavedIdea> findByIdAndUserId(String id, String userId);
}