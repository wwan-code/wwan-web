import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Item = sequelize.define('items', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    type: {
        type: DataTypes.ENUM('weapon', 'armor', 'helmet', 'boots', 'potion', 'material'),
        allowNull: false,
    },
    effects: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, { timestamps: false });

export default Item;