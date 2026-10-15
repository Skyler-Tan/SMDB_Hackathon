package com.threer.web;

import com.threer.dto.ReuseRequest;
import com.threer.dto.ReuseResponse;
import com.threer.service.ReuseService;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "http://localhost:4200")
@RequestMapping("/api")
public class ReuseController {

    private final ReuseService reuseService;

    public ReuseController(
            ReuseService reuseService) {

        this.reuseService =
                reuseService;
    }

    @PostMapping("/reuse")
    public ReuseResponse reuse(
            @RequestBody ReuseRequest request) {

        return reuseService.generateIdeas(
                request
        );
    }
}