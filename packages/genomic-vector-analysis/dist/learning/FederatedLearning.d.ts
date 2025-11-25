export interface FederatedConfig {
    numInstitutions: number;
    rounds: number;
    clientFraction: number;
    localEpochs: number;
    localBatchSize: number;
    learningRate: number;
    aggregationStrategy: 'fedavg' | 'fedprox' | 'fedopt';
    privacyBudget?: number;
    clippingNorm?: number;
    noiseMultiplier?: number;
}
export interface Institution {
    id: string;
    name: string;
    dataSize: number;
    modelWeights: Map<string, number[]>;
    trustScore: number;
    lastUpdate: number;
}
export interface LocalUpdate {
    institutionId: string;
    weights: Map<string, number[]>;
    dataSize: number;
    loss: number;
    accuracy: number;
    round: number;
    timestamp: number;
    privacySpent?: number;
}
export interface GlobalModel {
    weights: Map<string, number[]>;
    round: number;
    participatingInstitutions: string[];
    aggregatedDataSize: number;
    globalLoss: number;
    globalAccuracy: number;
}
export interface PrivacyAccountant {
    epsilon: number;
    delta: number;
    steps: number;
    privacyBudgetRemaining: number;
}
export interface SecureAggregationConfig {
    threshold: number;
    noiseScale: number;
    dropoutTolerance: number;
}
export interface HomomorphicEncryptionConfig {
    keySize: number;
    plainModulus: number;
    polyModulusDegree: number;
}
export declare class FederatedLearningCoordinator {
    private config;
    private institutions;
    private globalModel;
    private roundHistory;
    private privacyAccountant;
    constructor(config?: Partial<FederatedConfig>);
    registerInstitution(id: string, name: string, dataSize: number): void;
    train(): Promise<GlobalModel[]>;
    private selectInstitutions;
    private localTraining;
    private aggregateUpdates;
    private federatedAveraging;
    private federatedProximal;
    private federatedOptimization;
    private distributeGlobalModel;
    private addDifferentialPrivacyNoise;
    private gaussianNoise;
    private computePrivacySpent;
    private initializeGlobalModel;
    private initializePrivacyAccountant;
    private simulateTrainingStep;
    getStatistics(): {
        rounds: number;
        institutions: number;
        finalAccuracy: number;
        finalLoss: number;
        privacyAccountant: PrivacyAccountant | null;
        history: GlobalModel[];
    };
    exportGlobalModel(): GlobalModel;
}
export declare class SecureAggregation {
    private config;
    private shares;
    constructor(config?: Partial<SecureAggregationConfig>);
    createShares(institutionId: string, weights: Map<string, number[]>, numParticipants: number): Map<string, Map<string, number[]>>;
    private shamirSecretSharing;
    reconstructSecret(shares: Map<string, Map<string, number[]>>): Map<string, number[]>;
    private gaussianNoise;
}
export declare class HomomorphicEncryption {
    private config;
    private publicKey;
    private privateKey;
    constructor(config?: Partial<HomomorphicEncryptionConfig>);
    generateKeys(): {
        publicKey: string;
        privateKey: string;
    };
    encrypt(weights: number[], publicKey?: string): string;
    decrypt(encrypted: string, privateKey?: string): number[];
    add(encrypted1: string, encrypted2: string): string;
    multiplyScalar(encrypted: string, scalar: number): string;
}
//# sourceMappingURL=FederatedLearning.d.ts.map