import { useState, useEffect } from 'react';
import { mapData } from '../data/maps/sampleMap';

// Hook nhận thêm 2 tham số: danh sách quái vật và hàm callback onMonsterCollision
export const usePlayerMovement = (initialPosition, monsters, onMonsterCollision) => {
    const [position, setPosition] = useState(initialPosition);

    const isWalkable = (x, y) => {
        if (y < 0 || y >= mapData.length || x < 0 || x >= mapData[0].length) {
            return false;
        }
        const tileValue = mapData[y][x];
        if (tileValue === 1 || tileValue === 2 || tileValue === 4) {
            return false;
        }
        return true;
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            setPosition(prevPos => {
                let newX = prevPos.x;
                let newY = prevPos.y;

                switch (e.key) {
                    case 'ArrowUp': case 'w': newY -= 1; break;
                    case 'ArrowDown': case 's': newY += 1; break;
                    case 'ArrowLeft': case 'a': newX -= 1; break;
                    case 'ArrowRight': case 'd': newX += 1; break;
                    default: return prevPos;
                }

                // === LOGIC KIỂM TRA VA CHẠM MỚI ===
                // 1. Kiểm tra va chạm với quái vật trước
                const collidedMonster = monsters.find(m => m.pos.x === newX && m.pos.y === newY);
                if (collidedMonster) {
                    onMonsterCollision(collidedMonster); // Gọi callback và không di chuyển
                    return prevPos;
                }

                // 2. Nếu không có quái vật, kiểm tra va chạm với tường
                if (isWalkable(newX, newY)) {
                    return { x: newX, y: newY };
                }
                
                return prevPos;
            });
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [monsters, onMonsterCollision]); // Thêm dependencies mới

    return position;
};