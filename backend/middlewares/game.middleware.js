import db from '../models/index.js';

export async function getOrCreateCharacterId(req, res, next) {
    try {
        // userId được lấy từ middleware xác thực JWT (authJwt.verifyToken)
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID not found." });
        }

        // Tìm nhân vật của user này
        let character = await db.PlayerCharacter.findOne({ where: { userId } });

        // NẾU KHÔNG TÌM THẤY -> TỰ ĐỘNG TẠO MỚI!
        if (!character) {
            console.log(`PlayerCharacter not found for userId: ${userId}. Creating one now.`);
            character = await db.PlayerCharacter.create({
                userId: userId,
                // Các giá trị mặc định đã được thiết lập trong model
            });
        }
        
        // Gán characterId vào request để các controller sau có thể sử dụng
        req.characterId = character.id;
        next(); // Chuyển sang xử lý tiếp theo

    } catch (error) {
        console.error("Error in getOrCreateCharacterId middleware:", error);
        res.status(500).json({ message: "Error processing character data.", error: error.message });
    }
}

export const gameMiddleware = {
    getOrCreateCharacterId,
};