import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Companion = sequelize.define('companions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Các chỉ số cơ bản của loại đồng hành này
    baseStats: {
        type: DataTypes.JSON,
        allowNull: false,
    }
}, {
    timestamps: false
});

export default Companion;