package com.tuempresa.gestiontalleres.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuempresa.gestiontalleres.model.AssignedWorkshop;
import com.tuempresa.gestiontalleres.model.AssignedWorkshopId;

@Repository
public interface AssignedWorkshopRepository extends JpaRepository<AssignedWorkshop, AssignedWorkshopId> {
    // Aquí puedes agregar métodos de consulta personalizados si es necesario
}
