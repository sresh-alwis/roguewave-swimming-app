package com.roguewave.backend;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SwimmerService {

    private final SwimmerRepository swimmerRepository;

    public SwimmerService(SwimmerRepository swimmerRepository) {
        this.swimmerRepository = swimmerRepository;
    }

    public List<Swimmer> getAllSwimmers() {
        return swimmerRepository.findAll();
    }

    public Optional<Swimmer> getSwimmerById(Long id) {
        return swimmerRepository.findById(id);
    }

    public Swimmer addSwimmer(Swimmer swimmer) {
        return swimmerRepository.save(swimmer);
    }

    public Swimmer updateSwimmer(Long id, Swimmer updatedSwimmer) {
        Swimmer existingSwimmer = swimmerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Swimmer not found"));

        existingSwimmer.setName(updatedSwimmer.getName());
        existingSwimmer.setDateOfBirth(updatedSwimmer.getDateOfBirth());
        existingSwimmer.setLevel(updatedSwimmer.getLevel());
        existingSwimmer.setHeightFeet(updatedSwimmer.getHeightFeet());
        existingSwimmer.setHeightInches(updatedSwimmer.getHeightInches());
        existingSwimmer.setWeight(updatedSwimmer.getWeight());
        existingSwimmer.setExtraDetails(updatedSwimmer.getExtraDetails());

        return swimmerRepository.save(existingSwimmer);
    }

    public void deleteSwimmer(Long id) {
        swimmerRepository.deleteById(id);
    }
}