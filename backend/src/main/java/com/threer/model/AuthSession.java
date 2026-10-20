package com.threer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "auth_sessions")
public class AuthSession {

    @Id
    private String id;

    // SHA-256 hash of the token. The raw token is never stored.
    @Indexed(unique = true)
    private String tokenHash;

    private String userId;

    // MongoDB removes the document automatically once this time has passed.
    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}