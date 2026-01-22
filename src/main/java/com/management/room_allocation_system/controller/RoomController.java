package com.management.room_allocation_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.management.room_allocation_system.entity.Room;
import com.management.room_allocation_system.entity.RoomStatus;
import com.management.room_allocation_system.entity.RoomType;
import com.management.room_allocation_system.service.RoomService;

import jakarta.validation.Valid;


@RestController
@RequestMapping("/rooms")
public class RoomController {
	
	private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    

    @PostMapping
    public ResponseEntity<Room> createRoom(@Valid @RequestBody Room room) {
        Room createdRoom = roomService.createRoom(room);
        return new ResponseEntity<>(createdRoom, HttpStatus.CREATED);
    }

    

    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody Room room) {

        Room updatedRoom = roomService.updateRoom(id, room);
        return ResponseEntity.ok(updatedRoom);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Room> updateRoomStatus(
            @PathVariable Long id,
            @RequestParam RoomStatus status) {

        Room updatedRoom = roomService.updateRoomStatus(id, status);
        return ResponseEntity.ok(updatedRoom);
    }

    

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    

    @GetMapping("/available")
    public ResponseEntity<List<Room>> getAvailableRooms() {
        return ResponseEntity.ok(roomService.getAvailableRooms());
    }

    @GetMapping("/full")
    public ResponseEntity<List<Room>> getFullRooms() {
        return ResponseEntity.ok(roomService.getFullRooms());
    }

    @GetMapping("/type/{roomType}")
    public ResponseEntity<List<Room>> getRoomsByType(
            @PathVariable RoomType roomType) {

        return ResponseEntity.ok(roomService.getRoomsByType(roomType));
    }

}
