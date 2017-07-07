import * as rq from 'request';
import * as async from 'async';

import MongoConnector from './MongoConnector';
import {Db} from "mongodb";

export const serverListUrl = 'https://raw.githubusercontent.com/nilzao/soapbox-race-hill/master/serverlist-v2.txt';
export const connector = new MongoConnector();

let db: Db;

export async function init() {
    db = await connector.connect();
}

export type InternalInfo = {
    lastUpdated: number;
};

export type ServerInfo = {
    messageSrv: string;
    homePageUrl: string;
    facebookUrl: string;
    discordUrl: string;
    serverName: string;
    serverVersion: string;
    country: string;
    timezone: number;
    bannerUrl: string;
    adminList: string;
    ownerList: string;
    numberOfRegistered: number;
    activatedHolidaySceneryGroups: string[];
    disactivatedHolidaySceneryGroups: string[];
    onlineNumber: number;
    requireTicket: boolean;
};

export function fetchServers() {
    connector.getGeneric<InternalInfo>(db, 'info', {}).then(result => {
        const shouldUpdate = Date.now() - result.lastUpdated >= 60 * 2;

        if (shouldUpdate) {
            rq(serverListUrl, (err, response, body: string) => {
                if (response.statusCode === 200 && !err) {
                    body = body.trim();

                    const splitLines = body.split('\n');
                    const splitServers = splitLines.map(s => s.split(';'));

                    async.each(splitServers, (data: [string, string], callback) => {
                        const [name, ip] = data;

                        console.log(`[SF] Working on ${name}...`);

                        rq({
                            uri: `${ip}/soapbox-race-core/Engine.svc/GetServerInformation`,
                            json: true
                        }, (err, response, body: ServerInfo) => {
                           if (!err) {
                               console.log(`[SF] Got data for ${name}`);

                               connector.has(db, 'servers', { ip, name }).then(has => {
                                   if (has) {
                                       return connector.update(db, 'servers', { name, ip }, {
                                           name, ip, ...body
                                       }).then(() => {
                                           console.log(`[SF] Updated ${name}`);
                                           callback(null);
                                       }).catch((err) => {
                                           console.error(err);
                                           callback(err);
                                       });
                                   } else {
                                       return connector.insert(db, 'servers', {
                                           name, ip, ...body
                                       }).then(() => {
                                           console.log(`[SF] Inserted ${name}`);
                                           callback(null);
                                       }).catch((err) => {
                                           console.error(err);
                                           callback(err);
                                       });
                                   }
                               }).catch(err => {
                                   console.error(err);
                                   callback(err);
                               });
                           } else {
                               console.error(err);
                               callback(err);
                           }
                        });
                    }, (err?) => {
                        connector.update(db, 'info', {...result}, {lastUpdated: Date.now()}).catch(console.error);
                    });
                } else {
                    console.error(err);
                }
            });

            // rp({
            //     uri: serverListUrl,
            //     method: 'GET'
            // }).then((body: string) => {
            //     body = body.trim();
            //
            //     const splitLines = body.split('\n');
            //     const splitServers = splitLines.map(s => s.split(';'));
            //
            //     console.log(splitServers);
            //
            //     async.each(splitServers, (data: [string, string], callback) => {
            //         const [name, ip] = data;
            //
            //         rq({
            //             uri: `${ip}/soapbox-race-core/Engine.svc/GetServerInformation`,
            //             method: 'GET',
            //             json: true
            //         }).then(async (response: ServerInfo) => {
            //             const hasServer = await connector.has(db, 'servers', {name, ip});
            //
            //             if (hasServer) {
            //                 console.log(`Updating ${response.serverName}`);
            //
            //                 try {
            //                     await connector.update(db, 'servers', {name, ip}, {
            //                         name,
            //                         ip,
            //                         ...response
            //                     });
            //
            //                     callback(null);
            //                 } catch (err) {
            //                     console.error(err);
            //                     callback(err);
            //                 }
            //             } else {
            //                 console.log(`Inserting ${response.serverName}`);
            //
            //                 try {
            //                     await connector.insert(db, 'servers', {
            //                         name,
            //                         ip,
            //                         ...response
            //                     });
            //
            //                     callback(null);
            //                 } catch (err) {
            //                     console.error(err);
            //                     callback(err);
            //                 }
            //             }
            //         }).catch(console.error);
            //     }, (err?: Error) => {
            //         connector.update(db, 'info', {...result}, {lastUpdated: Date.now()}).catch(console.error);
            //     });
            // });
        }
    });
}

export function getServers(): Promise<ServerInfo[]> {
    return connector.getAll<ServerInfo>(db, 'servers');
}