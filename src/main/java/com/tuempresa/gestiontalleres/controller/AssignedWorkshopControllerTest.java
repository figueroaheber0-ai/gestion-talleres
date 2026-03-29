package com.tuempresa.gestiontalleres.controller;

import com.tuempresa.gestiontalleres.model.AssignedWorkshop;
import com.tuempresa.gestiontalleres.service.AssignedWorkshopService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AssignedWorkshopController.class)
public class AssignedWorkshopControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AssignedWorkshopService assignedWorkshopService;

    @Test
    public void testAssignWorkshop() throws Exception {
        AssignedWorkshop assignedWorkshop = new AssignedWorkshop();
        assignedWorkshop.setUserId(1L);
        assignedWorkshop.setWorkshopId(2L);

        when(assignedWorkshopService.saveAssignedWorkshop(assignedWorkshop)).thenReturn(assignedWorkshop);

        mockMvc.perform(post("/api/assignedworkshops")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":1,\"workshopId\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1L))
                .andExpect(jsonPath("$.workshopId").value(2L));
    }

    @Test
    public void testGetAssignedWorkshop() throws Exception {
        AssignedWorkshop assignedWorkshop = new AssignedWorkshop();
        assignedWorkshop.setUserId(1L);
        assignedWorkshop.setWorkshopId(2L);

        when(assignedWorkshopService.findAssignedWorkshopById(new AssignedWorkshopId(1L, 2L))).thenReturn(Optional.of(assignedWorkshop));

        mockMvc.perform(get("/api/assignedworkshops/1/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1L))
                .andExpect(jsonPath("$.workshopId").value(2L));
    }

    @Test
    public void testUnassignWorkshop() throws Exception {
        mockMvc.perform(delete("/api/assignedworkshops/1/2"))
                .andExpect(status().isNoContent());
    }
}
