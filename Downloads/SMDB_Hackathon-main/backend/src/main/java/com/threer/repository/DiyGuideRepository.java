package com.threer.repository;

import com.threer.model.DiyGuide;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DiyGuideRepository extends MongoRepository<DiyGuide, String> {
    List<DiyGuide> findByMaterialIgnoreCaseAndDifficultyIgnoreCaseOrderByTitleAsc(
            String material, String difficulty);
}
