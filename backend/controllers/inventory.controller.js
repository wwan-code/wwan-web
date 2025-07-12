import { inventoryService } from '../services/inventory.service.js';

async function getPlayerInventory(req, res) {
    try {
        const inventory = await inventoryService.getInventory(req.characterId);
        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function equipPlayerItem(req, res) {
    try {
        const { playerInventoryId } = req.body;
        if (!playerInventoryId) {
            return res.status(400).json({ message: 'playerInventoryId is required.' });
        }
        const result = await inventoryService.equipItem(req.characterId, playerInventoryId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

export const inventoryController = {
    getPlayerInventory,
    equipPlayerItem,
};