import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Router } from 'express';

/**
 * Dynamic Route Service
 * Erstellt automatisch Tabellen und CRUD-Endpoints basierend auf Konfiguration
 */
class DynamicRouteService {
    constructor() {
        this.models = new Map();
        this.routers = new Map();
    }

    /**
     * Erstellt ein Sequelize Model dynamisch
     */
    createModel(tableName, fields) {
        const modelFields = {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        };

        // Füge benutzerdefinierte Felder hinzu
        for (const field of fields) {
            modelFields[field.name] = this.mapFieldType(field);
        }

        const model = sequelize.define(tableName, modelFields, {
            tableName: tableName,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            underscored: true
        });

        this.models.set(tableName, model);
        return model;
    }

    /**
     * Mapped Feld-Typen zu Sequelize DataTypes
     */
    mapFieldType(field) {
        const typeMap = {
            'string': DataTypes.STRING(field.length || 255),
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

        return {
            type: typeMap[field.type] || DataTypes.STRING,
            allowNull: field.required !== true,
            defaultValue: field.default || null
        };
    }

    /**
     * Erstellt CRUD-Router für ein Model
     */
    createRouter(routeConfig, model) {
        const router = Router();
        const methods = routeConfig.methods || ['GET', 'POST', 'PUT', 'DELETE'];

        // GET all
        if (methods.includes('GET')) {
            router.get('/', async (req, res) => {
                try {
                    const { page = 1, limit = 50, sort = 'created_at', order = 'DESC', ...filters } = req.query;
                    
                    const where = {};
                    for (const [key, value] of Object.entries(filters)) {
                        if (model.rawAttributes[key]) {
                            where[key] = value;
                        }
                    }

                    const result = await model.findAndCountAll({
                        where,
                        limit: parseInt(limit),
                        offset: (parseInt(page) - 1) * parseInt(limit),
                        order: [[sort, order.toUpperCase()]]
                    });

                    res.json({
                        success: true,
                        data: result.rows,
                        pagination: {
                            total: result.count,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            pages: Math.ceil(result.count / parseInt(limit))
                        }
                    });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });

            // GET by ID
            router.get('/:id', async (req, res) => {
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

        // POST create
        if (methods.includes('POST')) {
            router.post('/', async (req, res) => {
                try {
                    const item = await model.create(req.body);
                    res.status(201).json({ success: true, data: item });
                } catch (error) {
                    res.status(400).json({ success: false, error: error.message });
                }
            });

            // POST bulk create
            router.post('/bulk', async (req, res) => {
                try {
                    if (!Array.isArray(req.body)) {
                        return res.status(400).json({ success: false, error: 'Body must be an array' });
                    }
                    const items = await model.bulkCreate(req.body);
                    res.status(201).json({ success: true, data: items, count: items.length });
                } catch (error) {
                    res.status(400).json({ success: false, error: error.message });
                }
            });
        }

        // PUT update
        if (methods.includes('PUT')) {
            router.put('/:id', async (req, res) => {
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
            router.delete('/:id', async (req, res) => {
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

            // DELETE bulk
            router.delete('/', async (req, res) => {
                try {
                    const { ids } = req.body;
                    if (!Array.isArray(ids)) {
                        return res.status(400).json({ success: false, error: 'ids must be an array' });
                    }
                    const deleted = await model.destroy({ where: { id: ids } });
                    res.json({ success: true, deleted });
                } catch (error) {
                    res.status(500).json({ success: false, error: error.message });
                }
            });
        }

        this.routers.set(routeConfig.path, router);
        return router;
    }

    /**
     * Initialisiert alle dynamischen Routen aus der Konfiguration
     */
    async initializeRoutes(customRoutes) {
        const routes = [];

        for (const routeConfig of customRoutes) {
            console.log(`📦 Creating dynamic route: ${routeConfig.path} -> ${routeConfig.table}`);

            // Erstelle Model
            const model = this.createModel(routeConfig.table, routeConfig.fields || []);

            // Synchronisiere Tabelle (erstellt sie wenn nicht vorhanden)
            await model.sync({ alter: true });
            console.log(`   ✅ Table '${routeConfig.table}' synchronized`);

            // Seed Daten falls vorhanden
            if (routeConfig.seed && Array.isArray(routeConfig.seed) && routeConfig.seed.length > 0) {
                const count = await model.count();
                if (count === 0) {
                    await model.bulkCreate(routeConfig.seed);
                    console.log(`   🌱 Seeded ${routeConfig.seed.length} records`);
                }
            }

            // Erstelle Router
            const router = this.createRouter(routeConfig, model);
            routes.push({ path: routeConfig.path, router, config: routeConfig });
        }

        return routes;
    }

    /**
     * Gibt Schema-Information für alle dynamischen Routen zurück
     */
    getSchema() {
        const schema = [];
        for (const [tableName, model] of this.models) {
            const fields = [];
            for (const [name, attr] of Object.entries(model.rawAttributes)) {
                fields.push({
                    name,
                    type: attr.type.key,
                    allowNull: attr.allowNull,
                    primaryKey: attr.primaryKey || false
                });
            }
            schema.push({ table: tableName, fields });
        }
        return schema;
    }
}

export default new DynamicRouteService();

