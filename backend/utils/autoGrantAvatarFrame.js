import db from '../models/index.js';

const ShopItem = db.ShopItem;
const UserInventory = db.UserInventory;

/**
 * Tự động tặng khung viền cho user khi lên cấp.
 * @param {number} userId 
 * @param {number} userLevel 
 * @param {Sequelize.Transaction} [transaction]
 */
export const autoGrantAvatarFrame = async (userId, userLevel, transaction = null) => {
    // Chỉ xử lý cho cấp <= 13 hoặc user vượt cấp 13 mà chưa có frame nào
    if (!userId || !userLevel) return;
    console.log(`=== autoGrantAvatarFrame: userId=${userId}, userLevel=${userLevel}`);
    // Lấy danh sách frame theo cấp (giả sử type = 'AVATAR_FRAME' và name = 'Khung cấp {level}')
    const frames = await ShopItem.findAll({
        where: {
            type: 'AVATAR_FRAME',
            name: { [db.Sequelize.Op.like]: 'Khung cấp %' }
        },
        transaction
    });
    console.log(`=== frames: ${JSON.stringify(frames)}`);
    // Map: {name: ShopItem}
    const frameByName = {};
    frames.forEach(f => {
        const level = f.name.replace('Khung cấp ', '');
        frameByName[level] = f;
    });

    // Kiểm tra user đã sở hữu frame nào chưa
    const ownedFrames = await UserInventory.findAll({
        where: {
            userId,
            shopItemId: frames.map(f => f.id)
        },
        transaction
    });
    const ownedFrameIds = new Set(ownedFrames.map(f => f.shopItemId));
    // Nếu user vừa lên cấp <= 13 và chưa có frame đó thì tặng
    if (userLevel <= 13 && frameByName[userLevel] && !ownedFrameIds.has(frameByName[userLevel].id)) {
        console.log(`=== Tạo khung cấp ${userLevel} cho user ${userId}`);
        await UserInventory.create({
            userId,
            shopItemId: frameByName[userLevel].id,
            isActive: false,
            quantity: 1
        }, { transaction });
    }

    // Nếu user vượt cấp 13 mà chưa có frame nào thì tặng toàn bộ frame 1-13
    if (userLevel > 13 && ownedFrameIds.size === 0) {
        const toGrant = [];
        for (let lvl = 1; lvl <= 13; lvl++) {
            if (frameByName[lvl]) {
                toGrant.push({
                    userId,
                    shopItemId: frameByName[lvl].id,
                    isActive: false,
                    quantity: 1
                });
            }
        }
        console.log(`=== toGrant: ${JSON.stringify(toGrant)}`);
        if (toGrant.length > 0) {
            console.log(`==== Tạo khung cấp 1-13 cho user ${userId}`);
            await UserInventory.bulkCreate(toGrant, { transaction, ignoreDuplicates: true });
        }
    }
};

/**
 * Tự động tặng màu tên chat cho user khi lên cấp.
 * Cứ mỗi 5 cấp sẽ tặng 1 màu tên chat (rank_level-1 ... rank_level-6) cho đến cấp 30.
 * @param {number} userId 
 * @param {number} userLevel 
 * @param {Sequelize.Transaction} [transaction]
 */
export const autoGrantChatColor = async (userId, userLevel, transaction = null) => {
    if (!userId || !userLevel) return;

    // Các mốc cấp và tên vật phẩm tương ứng
    const chatColorLevels = [5, 10, 15, 20, 25, 30];
    const chatColorValues = [
        'rank_level-1',
        'rank_level-2',
        'rank_level-3',
        'rank_level-4',
        'rank_level-5',
        'rank_level-6'
    ];

    // Kiểm tra user vừa đạt mốc nào
    const idx = chatColorLevels.findIndex(lv => lv === userLevel);
    if (idx !== -1) {
        // Lấy ShopItem tương ứng
        const chatColorItem = await ShopItem.findOne({
            where: {
                type: 'CHAT_COLOR',
                value: chatColorValues[idx]
            },
            transaction
        });
        if (!chatColorItem) return;

        // Kiểm tra user đã sở hữu chưa
        const owned = await UserInventory.findOne({
            where: {
                userId,
                shopItemId: chatColorItem.id
            },
            transaction
        });
        if (owned) return;

        // Tặng vật phẩm
        await UserInventory.create({
            userId,
            shopItemId: chatColorItem.id,
            isActive: false,
            quantity: 1
        }, { transaction });

        console.log(`=== Tặng màu tên chat ${chatColorValues[idx]} cho user ${userId}`);
    }

    // Nếu user vượt cấp 30 mà chưa có màu tên chat nào thì tặng toàn bộ rank_level-1 đến rank_level-6
    if (userLevel > 30) {
        // Lấy tất cả các ShopItem màu tên chat
        const chatColorItems = await ShopItem.findAll({
            where: {
                type: 'CHAT_COLOR',
                value: chatColorValues
            },
            transaction
        });

        // Kiểm tra user đã sở hữu màu nào chưa
        const ownedColors = await UserInventory.findAll({
            where: {
                userId,
                shopItemId: chatColorItems.map(i => i.id)
            },
            transaction
        });
        const ownedColorIds = new Set(ownedColors.map(i => i.shopItemId));

        // Nếu chưa có màu nào thì tặng toàn bộ
        if (ownedColorIds.size === 0 && chatColorItems.length > 0) {
            const toGrant = chatColorItems.map(i => ({
                userId,
                shopItemId: i.id,
                isActive: false,
                quantity: 1
            }));
            console.log(`=== Tặng lại toàn bộ màu tên chat rank_level-1 đến 6 cho user ${userId}`);
            await UserInventory.bulkCreate(toGrant, { transaction, ignoreDuplicates: true });
        }
    }
};