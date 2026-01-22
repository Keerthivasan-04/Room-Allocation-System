package com.management.room_allocation_system.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.management.room_allocation_system.entity.Room;
import com.management.room_allocation_system.entity.RoomStatus;
import com.management.room_allocation_system.entity.RoomType;
import com.management.room_allocation_system.exception.RoomNotFoundException;
import com.management.room_allocation_system.repository.RoomRepository;
import com.management.room_allocation_system.service.RoomService;

@Service
public class RoomServiceImpl implements RoomService{

	private final RoomRepository roomRepository;
	
	public RoomServiceImpl(RoomRepository roomRepository) {
		this.roomRepository = roomRepository;
	}

	@Override
	public Room createRoom(Room room) {
		room.setStatus(RoomStatus.AVAILABLE);
		room.setCurrentOccupancy(0);
		return roomRepository.save(room);
	}

	@Override
	public Room updateRoom(Long id, Room room) {
		Room existingRoom = getRoomById(id);
		existingRoom.setRoomNumber(room.getRoomNumber());
		existingRoom.setCapacity(room.getCapacity());
		existingRoom.setRoomType(room.getRoomType());
		
		
		return roomRepository.save(existingRoom);
	}

	@Override
	public void deleteRoom(Long id) {
		Room room = getRoomById(id);
		roomRepository.delete(room);
		
		
	}

	@Override
	public Room getRoomById(Long id) {
		return roomRepository.findById(id).orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + id));
	}

	@Override
	public List<Room> getAllRooms() {
		return roomRepository.findAll();
	}

	@Override
	public List<Room> getAvailableRooms() {
		return roomRepository.findByStatus(RoomStatus.AVAILABLE);
	}

	@Override
	public List<Room> getFullRooms() {
		return roomRepository.findByStatus(RoomStatus.OCCUPIED);
	}

	@Override
	public List<Room> getRoomsByType(RoomType roomType) {
		return roomRepository.findByRoomType(roomType);
	}
	

	@Override
	public Room updateRoomStatus(Long id, RoomStatus status) {
		Room updatedRoom = getRoomById(id);
		updatedRoom.setStatus(status);
		return roomRepository.save(updatedRoom);
	}

	@Override
	public void incrementOccupancy(Room room) {
		
		if(room.getCurrentOccupancy() >= room.getCapacity()) {
			room.setStatus(RoomStatus.OCCUPIED);
			return;
		}
		
		room.setCurrentOccupancy(room.getCurrentOccupancy() + 1);
		
		if(room.getCurrentOccupancy() == room.getCapacity()) {
			room.setStatus(RoomStatus.OCCUPIED);
		}
		
		roomRepository.save(room);
	}

	@Override
	public void decrementOccupancy(Room room) {
		
		if(room.getCurrentOccupancy() <= 0) {
			return;
		}
		
		room.setCurrentOccupancy(room.getCurrentOccupancy() - 1);
		
		if(room.getCurrentOccupancy() <= 0) {
			room.setStatus(RoomStatus.AVAILABLE);
		}
		
		roomRepository.save(room);
	}
}
