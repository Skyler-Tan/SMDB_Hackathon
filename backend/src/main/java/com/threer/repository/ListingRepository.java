package com.threer.repository;

import com.threer.model.Listing;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ListingRepository extends MongoRepository<Listing, String> {

    // Newest listings first.
    List<Listing> findAllByOrderByCreatedAtDesc();
}