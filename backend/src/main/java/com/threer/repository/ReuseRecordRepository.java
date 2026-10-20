package com.threer.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.threer.service.ReuseRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Stores reuse history without needing a database: records are kept in memory
 * and written to a JSON file (default: data/reuse-history.json, relative to
 * where the backend is started) so they survive restarts.
 *
 * Change the location with:  app.reuse-history.file=some/other/path.json
 */
@Repository
public class ReuseRecordRepository {

    private static final Logger log = LoggerFactory.getLogger(ReuseRecordRepository.class);

    private final ObjectMapper mapper;
    private final Path file;
    private final List<ReuseRecord> records = new ArrayList<>();
    private final AtomicLong sequence = new AtomicLong();

    public ReuseRecordRepository(
            ObjectMapper mapper,
            @Value("${app.reuse-history.file:data/reuse-history.json}") String path) {
        this.mapper = mapper;
        this.file = Path.of(path);
        load();
    }

    public synchronized ReuseRecord save(ReuseRecord record) {
        record.setId(sequence.incrementAndGet());
        if (record.getCreatedAt() == null) {
            record.setCreatedAt(Instant.now());
        }
        records.add(record);
        persist();
        return record;
    }

    public synchronized List<ReuseRecord> findByUserIdOrderByCreatedAtDesc(String userId) {
        return records.stream()
                .filter(record -> userId.equals(record.getUserId()))
                .sorted(Comparator
                        .comparing(ReuseRecord::getCreatedAt,
                                Comparator.nullsFirst(Comparator.<Instant>naturalOrder()))
                        .reversed())
                .toList();
    }

    private synchronized void load() {
        if (!Files.exists(file)) {
            return;
        }

        try {
            List<ReuseRecord> stored =
                    mapper.readValue(file.toFile(), new TypeReference<List<ReuseRecord>>() {});
            records.addAll(stored);
            stored.stream()
                    .map(ReuseRecord::getId)
                    .filter(Objects::nonNull)
                    .max(Long::compare)
                    .ifPresent(sequence::set);
            log.info("Loaded {} reuse records from {}", stored.size(), file.toAbsolutePath());
        } catch (IOException e) {
            log.warn("Could not read reuse history from {}: {}", file.toAbsolutePath(), e.getMessage());
        }
    }

    private void persist() {
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            mapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), records);
        } catch (IOException e) {
            log.error("Could not save reuse history to {}: {}", file.toAbsolutePath(), e.getMessage());
        }
    }
}