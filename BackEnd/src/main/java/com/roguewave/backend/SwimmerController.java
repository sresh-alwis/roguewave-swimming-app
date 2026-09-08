package com.roguewave.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/swimmers")
@CrossOrigin(origins = "http://localhost:5173")
public class SwimmerController {

    private final SwimmerService swimmerService;

    public SwimmerController(SwimmerService swimmerService) {
        this.swimmerService = swimmerService;
    }

    @GetMapping
    public List<Swimmer> getAllSwimmers() {
        return swimmerService.getAllSwimmers();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Swimmer> getSwimmerById(@PathVariable Long id) {
        return swimmerService.getSwimmerById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Swimmer addSwimmer(@RequestBody Swimmer swimmer) {
        return swimmerService.addSwimmer(swimmer);
    }

    @PutMapping("/{id}")
    public Swimmer updateSwimmer(
            @PathVariable Long id,
            @RequestBody Swimmer swimmer
    ) {
        return swimmerService.updateSwimmer(id, swimmer);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSwimmer(@PathVariable Long id) {
        swimmerService.deleteSwimmer(id);
        return ResponseEntity.noContent().build();
    }
}
