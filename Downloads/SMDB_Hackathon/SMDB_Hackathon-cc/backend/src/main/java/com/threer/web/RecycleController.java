package com.threer.web;

import com.threer.dto.RecycleRequest;
import com.threer.dto.RecycleResultResponse;
import com.threer.dto.StatsResponse;
import com.threer.model.RecycleEvent;
import com.threer.service.RecycleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RecycleController {

    private final RecycleService recycleService;

    public RecycleController(RecycleService recycleService) {
        this.recycleService = recycleService;
    }

    @PostMapping("/recycle")
    public RecycleResultResponse recycle(@RequestBody RecycleRequest request) {
        return recycleService.recycle(request);
    }

    @GetMapping("/stats")
    public StatsResponse stats(@RequestParam(required = false) String userId) {
        return recycleService.stats(userId);
    }

    @GetMapping("/history")
    public List<RecycleEvent> history(@RequestParam(required = false) String userId) {
        return recycleService.history(userId);
    }
}
