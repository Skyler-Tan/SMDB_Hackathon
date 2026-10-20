package com.threer.service;

import com.threer.model.AuthSession;
import com.threer.repository.AuthSessionRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class SessionService {

    private static final Duration LIFETIME = Duration.ofDays(7);

    private final AuthSessionRepository repo;
    private final SecureRandom random = new SecureRandom();

    public SessionService(AuthSessionRepository repo) {
        this.repo = repo;
    }

    /** Creates a session and returns the raw token to send to the client. */
    public String create(String userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        AuthSession session = new AuthSession();
        session.setTokenHash(hash(token));
        session.setUserId(userId);
        session.setExpiresAt(Instant.now().plus(LIFETIME));
        repo.save(session);

        return token;
    }

    /** Returns the user id for a valid, unexpired token. */
    public Optional<String> userIdFor(String token) {
        return repo.findByTokenHash(hash(token))
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .map(AuthSession::getUserId);
    }

    public void revoke(String token) {
        repo.deleteByTokenHash(hash(token));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}