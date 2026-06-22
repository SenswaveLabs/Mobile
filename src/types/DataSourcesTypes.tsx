export type MqttVersion = "MqttV5" | "MqttV311" | "MqttV310";

export type DataSourceDto = {
    id: string;
    name: string;
    url: string;
    clientName: string;
    port: number;
    mqttVersion: MqttVersion;
    tls: boolean;
};

export type SubscriptionDto = {
    id: string;
    topic: string;
};

export type CreateSubscriptionRequest = {
    topic: string;
};
