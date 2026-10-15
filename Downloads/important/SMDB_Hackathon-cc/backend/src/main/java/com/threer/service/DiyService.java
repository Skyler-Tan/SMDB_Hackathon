package com.threer.service;

import com.threer.model.DiyGuide;
import com.threer.repository.DiyGuideRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DiyService {

    private final DiyGuideRepository diyGuideRepository;

    public DiyService(DiyGuideRepository diyGuideRepository) {
        this.diyGuideRepository = diyGuideRepository;
    }

    public List<DiyGuide> list(String material, String difficulty) {
        if (material == null || material.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "material is required");
        }
        String level = (difficulty == null || difficulty.isBlank()) ? "easy" : difficulty;
        return diyGuideRepository.findByMaterialIgnoreCaseAndDifficultyIgnoreCaseOrderByTitleAsc(material, level);
    }

    public DiyGuide get(String id) {
        return diyGuideRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DIY not found"));
    }
}
