package com.tuempresa.gestiontalleres.service;

import com.tuempresa.gestiontalleres.model.AssignedWorkshop;
import com.tuempresa.gestiontalleres.model.AssignedWorkshopId;
import com.tuempresa.gestiontalleres.repository.AssignedWorkshopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AssignedWorkshopService {

    @Autowired
    private AssignedWorkshopRepository assignedWorkshopRepository;

    public AssignedWorkshop saveAssignedWorkshop(AssignedWorkshop assignedWorkshop) {
        return assignedWorkshopRepository.save(assignedWorkshop);
    }

    public Optional<AssignedWorkshop> findAssignedWorkshopById(AssignedWorkshopId id) {
        return assignedWorkshopRepository.findById(id);
    }

    public void deleteAssignedWorkshop(AssignedWorkshopId id) {
        assignedWorkshopRepository.deleteById(id);
    }

    // Agregar más métodos según sea necesario
}
