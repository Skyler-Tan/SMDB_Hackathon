package com.threer.repository;

import com.threer.model.AuthSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AuthSessionRepository extends MongoRepository<AuthSession, String> {
    Optional<AuthSession> findByTokenHash(String tokenHash);

    void deleteByTokenHash(String tokenHash);
}