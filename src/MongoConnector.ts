import {Db, InsertOneWriteOpResult, InsertWriteOpResult, MongoClient as Client, UpdateWriteOpResult} from "mongodb";

export default class MongoConnector {
    private url: string;

    constructor() {
        this.url = `mongodb://localhost:27017/soapbox-servers`;
    }

    /**
     * Connect to the database.
     *
     * @returns {Promise<Db>}
     */
    async connect(): Promise<Db> {
        return new Promise<Db>((resolve, reject) => {
            return Client.connect(this.url, (error: Error, db: Db) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(db);
                }
            });
        });
    }

    /**
     * Insert data into a collection.
     *
     * @param db
     * @param collectionName
     * @param data
     * @return {Promise<InsertOneWriteOpResult>}
     */
    insert(db: Db, collectionName: string, data: object): Promise<InsertOneWriteOpResult> {
        return db.collection(collectionName).insertOne(data);
    }

    /**
     * Insert data into a collection and get the result.
     *
     * @param db
     * @param collectionName
     * @param data
     * @param conversionFunction
     * @return {Promise<T>}
     */
    insertAndGet<T>(db: Db, collectionName: string, data: T, conversionFunction?: (item: object) => T): Promise<T> {
        return db.collection(collectionName).insertOne(data)
            .then((result: InsertOneWriteOpResult) => {
                if (conversionFunction)
                    return <T> conversionFunction(result.ops[0]);
                return <T> result.ops[0];
            });
    }

    /**
     * Insert multiple datums into a collection and get the results.
     *
     * @param db
     * @param collectionName
     * @param data
     * @param conversionFunction
     * @return {Promise<T[]>}
     */
    insertManyAndGet<T>(db: Db, collectionName: string, data: T[], conversionFunction?: (item: object) => T): Promise<T[]> {
        return db.collection(collectionName).insertMany(data)
            .then((result: InsertWriteOpResult) => <T[]>result.ops.map((item: object) => {
                if (conversionFunction)
                    return conversionFunction(item);
                return item;
            }));
    }

    /**
     * Update data in a collection.
     *
     * @param db
     * @param collectionName
     * @param criteria
     * @param data
     * @return {Promise<UpdateWriteOpResult>}
     */
    update(db: Db, collectionName: string, criteria: object, data: object): Promise<UpdateWriteOpResult> {
        return db.collection(collectionName).updateOne(criteria, data);
    }

    /**
     * Finds data in a collection.
     *
     * @param db
     * @param collectionName
     * @param query
     * @return {Promise<object>}
     */
    get(db: Db, collectionName: string, query: object): Promise<object> {
        return db.collection(collectionName).findOne(query);
    }

    /**
     * Finds data in a collection.
     *
     * @param db
     * @param collectionName
     * @param query
     * @param conversionFunction
     * @return {Promise<object>}
     */
    getGeneric<T>(db: Db, collectionName: string, query: object, conversionFunction?: (item: object) => T): Promise<T> {
        return db.collection(collectionName).findOne(query).then((result) : T => {
            if (conversionFunction)
                return <T> conversionFunction(result);
            return <T> result;
        });
    }

    /**
     * Gets all data in a collection.
     *
     * @param db
     * @param collectionName
     * @param conversionFunction
     * @return {Promise<T[]>}
     */
    getAll<T>(db: Db, collectionName: string, conversionFunction?: (item: object) => T): Promise<T[]> {
        return db.collection(collectionName).find().toArray().then((results) : T[] => {
            return <T[]> results.map((item: object) => {
                if (conversionFunction)
                    return conversionFunction(item);
                return item;
            });
        });
    }

    /**
     * Counts the number of instances of an object in a collection.
     *
     * @param db
     * @param collectionName
     * @param cObject
     * @return {Promise<number>}
     */
    count(db: Db, collectionName: string, cObject: object): Promise<number> {
        return db.collection(collectionName).count(cObject);
    }

    /**
     * Determine if the given data exists in a collection.
     *
     * @param db
     * @param collectionName
     * @param cObject
     * @return {boolean}
     */
    has(db: Db, collectionName: string, cObject: object): Promise<boolean> {
        return this.get(db, collectionName, cObject).then(res => {
            return res != null;
        });
    }
}
