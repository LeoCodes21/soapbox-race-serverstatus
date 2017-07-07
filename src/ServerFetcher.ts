import * as rp from 'request-promise';
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
            rp({
                uri: serverListUrl,
                method: 'GET'
            }).then((body: string) => {
                body = body.trim();

                const splitLines = body.split('\n');
                const splitServers = splitLines.map(s => s.split(';'));

                for (const [name, ip] of splitServers) {
                    rp({
                        uri: `${ip}/soapbox-race-core/Engine.svc/GetServerInformation`,
                        method: 'GET',
                        json: true
                    }).then((response: ServerInfo) => {
                        connector.has(db, 'servers', { name, ip }).then(hasServer => {
                            if (hasServer) {
                                console.log(`Updating ${response.serverName}`);
                                connector.update(db, 'servers', { name, ip }, {
                                    name,
                                    ip,
                                    ...response
                                }).catch(console.error);
                            } else {
                                console.log(`Inserting ${response.serverName}`);
                                connector.insert(db, 'servers', {
                                    name,
                                    ip,
                                    ...response
                                }).catch(console.error);
                            }

                            connector.update(db, 'info', { ...result }, { lastUpdated: Date.now() }).catch(console.error);
                        });
                    }).catch(console.error);
                }
            });
        }
    });
}

export function getServers() : Promise<ServerInfo[]> {
    return connector.getAll<ServerInfo>(db, 'servers');
}