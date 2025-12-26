import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import express from 'express';

/**
 * Dynamic Routes Service
 * Erstellt automatisch API-Routen und Datenbanktabellen basierend auf Konfiguration
 */
class DynamicRoutesService {
    constructor() {
        this.models = new Map();
        this.router = express.Router();
    }

    /**
     * Initialisiert dynamische Routen aus der Konfiguration
     * @param {Array} routeConfigs - Array von Route-Konfigurationen
     */
    async initialize(routeConfigs) {
        if (!routeConfigs || !Array.isArray(routeConfigs)) {
            console.log('[DynamicRoutes] No custom routes configured');
            return this.router;
        }

        console.log(`[DynamicRoutes] Initializing ${routeConfigs.length} custom routes...`);

        for (const config of routeConfigs) {
            try {
                await this.createRoute(config);
                console.log(`[DynamicRoutes] ✓ Created route: ${config.path} -> ${config.table}`);
            } catch (error) {
                console.error(`[DynamicRoutes] ✗ Failed to create route ${config.path}:`, error.message);
            }
        }

        return this.router;
    }

    /**
     * Erstellt eine einzelne Route mit zugehöriger Tabelle
     */
    async createRoute(config) {
        const { path, table, methods = ['GET', 'POST', 'PUT', 'DELETE'], fields = [] } = config;

        if (!path || !table) {
            throw new Error('path and table are required');
        }

        // Tabelle erstellen/Model definieren
        const model = await this.createModel(table, fields);
        this.models.set(table, model);

        // Sync mit Datenbank (erstellt Tabelle falls nicht vorhanden)
        await model.sync({ alter: true });

        // CRUD-Routen erstellen
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        // GET all
        if (methods.includes('GET')) {
            this.router.get(normalizedPath, async (req, res) => {
                try {
                    const { limit = 100, offset = 0, sort = 'created_at', order = 'DESC', ...filters } = req.query;
                    
                    const where = {};
                    for (const [key, value] of Object.entries(filters)) {
                        if (model.rawAttributes[key]) {
                            where[key] = value;
                        }
                    }

                    const items = await model.findAndCountAll({
                        where,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        order: [[sort, order.toUpperCase()]]
                    });

                    res.json({
                        success: true,
                        data: items.rows,
                        pagination: {
                            total: items.count,
                            limit: parseInt(limit),
                            offset: parseInt(offset)
                        }
                    });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // GET by ID
            this.router.get(`${normalizedPath}/:id`, async (req, res) => {
                try {
                    const item = await model.findByPk(req.params.id);
                    if (!item) {
                        return res.status(404).json({ success: false, error: 'Not found' });
                    }
                    res.json({ success: true, data: item });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });
        }

        // POST (create)
        if (methods.includes('POST')) {
            this.router.post(normalizedPath, async (req, res) => {
                try {
                    const item = await model.create(req.body);
                    res.status(201).json({ success: true, data: item });
                } catch (error) {
                    res.status(400).json({ success: false, error: error.message });
                }
            });
        }

        // PUT (update)
        if (methods.includes('PUT')) {
            this.router.put(`${normalizedPath}/:id`, async (req, res) => {
                try {
                    const item = await model.findByPk(req.params.id);
                    if (!item) {
                        return res.status(404).json({ success: false, error: 'Not found' });
                    }
                    await item.update(req.body);
                    res.json({ success: true, data: item });
                } catch (error) {
                    res.status(400).json({ success: false, error: error.message });
                }
            });
        }

        // DELETE
        if (methods.includes('DELETE')) {
            this.router.delete(`${normalizedPath}/:id`, async (req, res) => {
                try {
                    const item = await model.findByPk(req.params.id);
                    if (!item) {
                        return res.status(404).json({ success: false, error: 'Not found' });
                    }
                    await item.destroy();
                    res.json({ success: true, message: 'Deleted successfully' });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });
        }
    }

    /**
     * Erstellt ein Sequelize Model basierend auf der Feld-Konfiguration
     */
    async createModel(tableName, fields = []) {
        const attributes = {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            }
        };

        // Standard-Felder hinzufügen wenn keine definiert
        if (fields.length === 0) {
            fields = [
                { name: 'name', type: 'string', required: true },
                { name: 'description', type: 'text' },
                { name: 'data', type: 'json' }
            ];
        }

        // Felder aus Konfiguration hinzufügen
        for (const field of fields) {
            attributes[field.name] = {
                type: this.mapFieldType(field.type || 'string'),
                allowNull: !field.required,
                defaultValue: field.default
            };
        }

        // Timestamps
        attributes.created_at = {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        };
        attributes.updated_at = {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        };

        const model = sequelize.define(tableName, attributes, {
            tableName: tableName,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            underscored: true
        });

        return model;
    }

    /**
     * Mappt Feld-Typen zu Sequelize DataTypes
     */
    mapFieldType(type) {
        const typeMap = {
            'string': DataTypes.STRING(255),
            'text': DataTypes.TEXT,
            'integer': DataTypes.INTEGER,
            'float': DataTypes.FLOAT,
            'decimal': DataTypes.DECIMAL(10, 2),
            'boolean': DataTypes.BOOLEAN,
            'date': DataTypes.DATEONLY,
            'datetime': DataTypes.DATE,
            'json': DataTypes.JSON,
            'uuid': DataTypes.UUID
        };
        return typeMap[type.toLowerCase()] || DataTypes.STRING(255);
    }

    /**
     * Gibt alle registrierten Routen zurück (für Dokumentation)
     */
    getRouteInfo() {
        const routes = [];
        for (const [table, model] of this.models) {
            routes.push({
                table,
                fields: Object.keys(model.rawAttributes).filter(f => !['id', 'created_at', 'updated_at'].includes(f)),
                endpoints: [
                    `GET /api/custom/${table}`,
                    `GET /api/custom/${table}/:id`,
                    `POST /api/custom/${table}`,
                    `PUT /api/custom/${table}/:id`,
                    `DELETE /api/custom/${table}/:id`
                ]
            });
        }
        return routes;
    }
}

export default new DynamicRoutesService();

