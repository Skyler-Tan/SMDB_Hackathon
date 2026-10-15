package com.threer.web;

import com.threer.model.DiyGuide;
import com.threer.service.DiyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/diy")
public class DiyController {

    private final DiyService diyService;

    public DiyController(DiyService diyService) {
        this.diyService = diyService;
    }

    @GetMapping
    public List<DiyGuide> list(
            @RequestParam String material,
            @RequestParam(defaultValue = "easy") String difficulty) {
        return diyService.list(material, difficulty);
    }

    @GetMapping("/{id}")
    public DiyGuide get(@PathVariable String id) {
        return diyService.get(id);
    }
}
