package com.tuempresa.gestiontalleres.controller;


import com.tuempresa.gestiontalleres.model.AssignedWorkshop;
import com.tuempresa.gestiontalleres.model.AssignedWorkshopId;
import com.tuempresa.gestiontalleres.service.AssignedWorkshopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.Optional;

@RestController
@RequestMapping("/api/assignedworkshops")
public class AssignedWorkshopController {

    @Autowired
    private AssignedWorkshopService assignedWorkshopService;

    @PostMapping
    public ResponseEntity<AssignedWorkshop> assignWorkshop(@RequestBody AssignedWorkshop assignedWorkshop) {
        AssignedWorkshop savedAssignedWorkshop = assignedWorkshopService.saveAssignedWorkshop(assignedWorkshop);
        return ResponseEntity.ok(savedAssignedWorkshop);
    }

    @GetMapping("/{userId}/{workshopId}")
    public ResponseEntity<AssignedWorkshop> getAssignedWorkshop(@PathVariable Long userId, @PathVariable Long workshopId) {
        AssignedWorkshopId id = new AssignedWorkshopId();
        id.setUserId(userId);
        id.setWorkshopId(workshopId);
        Optional<AssignedWorkshop> assignedWorkshop = assignedWorkshopService.findAssignedWorkshopById(id);
        return assignedWorkshop.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{userId}/{workshopId}")
    public ResponseEntity<Void> unassignWorkshop(@PathVariable Long userId, @PathVariable Long workshopId) {
        AssignedWorkshopId id = new AssignedWorkshopId();
        id.setUserId(userId);
        id.setWorkshopId(workshopId);
        assignedWorkshopService.deleteAssignedWorkshop(id);
        return ResponseEntity.noContent().build();
    }

    // Agregar más métodos según sea necesario
}
