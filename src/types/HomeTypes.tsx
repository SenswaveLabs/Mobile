export type HomeSharingDto = {
    sharingId: string;
    friendEmail: string;
    sharingType: string;
};

export const HomeRolesToName: Map<string, string> = new Map([
    ["Display", "Display and Act in Home"],
    ["Manage", "Display, Act and Manage Home"],
    ["Invalid", "Invalid Role"],
    ["", "Empty Role"],
]);

export interface Room {
    id: string;
    name: string;
}

export interface Location {
    latitude: number;
    longitude: number;
}

export interface HomeDataSource {
    id: string;
    name: string;
    state: string;
}

export interface Home {
    id: string;

    name: string;
    icon: string;
    isOwner: boolean;

    dataSource: HomeDataSource;
    location: Location;
    rooms: Room[];
}
