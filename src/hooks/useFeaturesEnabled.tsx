import React, { createContext, useContext, useMemo } from 'react'
import { SupportedChains } from '@gooddollar/web3sdk-v2'
import { useFeatureFlagWithPayload } from 'posthog-react-native'

interface ChainFeatureConfig {
    [featureName: string]: boolean | undefined
}

interface FeatureConfigPayload {
    networks: Record<SupportedChains, ChainFeatureConfig>
    globalDefaults: Record<string, boolean | undefined>
}

interface FeatureContextValue {
    isFeatureActive: (featureName: string, chainId?: SupportedChains | number) => boolean
    activeNetworksByFeature: Record<string, SupportedChains[]>
}

const supportedFeatureKeys = [
    'networkEnabled',
    'microBridgeEnabled',
    'lzBridgeEnabled',
    'reserveEnabled',
    'claimEnabled',
    'dexSwapEnabled',
    'stakingEnabled',
    'governanceEnabled',
]

const localFeatureConfig: FeatureConfigPayload = {
    networks: {
        [SupportedChains.CELO]: {
            networkEnabled: true,
            microBridgeEnabled: true,
            lzBridgeEnabled: false,
            reserveEnabled: true,
            claimEnabled: true,
            dexSwapEnabled: true,
        },
        [SupportedChains.MAINNET]: {
            networkEnabled: true,
            microBridgeEnabled: false,
            lzBridgeEnabled: false,
            reserveEnabled: false,
            claimEnabled: false,
            stakingEnabled: false,
        },
        [SupportedChains.FUSE]: {
            networkEnabled: true,
            microBridgeEnabled: true,
            lzBridgeEnabled: false,
            reserveEnabled: false,
            claimEnabled: true,
            governanceEnabled: true,
        },
        [SupportedChains.XDC]: {
            networkEnabled: false,
            microBridgeEnabled: false,
            lzBridgeEnabled: false,
            reserveEnabled: false,
            claimEnabled: false,
        },
    },
    globalDefaults: {
        defaultEnabled: true,
        defaultNetworkEnabled: true,
        defaultMicroBridgeEnabled: true,
        defaultLzBridgeEnabled: true,
        defaultReserveEnabled: true,
        defaultClaimEnabled: true,
    },
}

const disabledFeatureConfig: FeatureConfigPayload = {
    networks: {} as Record<SupportedChains, ChainFeatureConfig>,
    globalDefaults: {
        defaultEnabled: false,
    },
}

export const isFeatureActive = (
    activeNetworksByFeature: Record<string, SupportedChains[]>,
    featureName: string,
    chainId?: number | string | null
): boolean => {
    if (!chainId) return false
    return activeNetworksByFeature[featureName]?.includes(Number(chainId) as SupportedChains) ?? false
}

export const getChainFeatures = (
    activeNetworksByFeature: Record<string, SupportedChains[]>,
    chainId?: number | string | null
): Record<string, boolean> =>
    Object.fromEntries(
        supportedFeatureKeys.map((feature) => [feature, isFeatureActive(activeNetworksByFeature, feature, chainId)])
    )

const GoodDappFeatureContext = createContext<FeatureContextValue | undefined>(undefined)

export const GoodDappFeatureProvider: React.FC<{
    featureConfig?: FeatureConfigPayload
    children: React.ReactNode
}> = ({ children }) => {
    const [featureConfigFlag, payload] = useFeatureFlagWithPayload('gooddapp-feature-config')
    const featureConfig =
        featureConfigFlag === false
            ? disabledFeatureConfig
            : (payload as FeatureConfigPayload | undefined) ?? localFeatureConfig

    const contextValue: FeatureContextValue = useMemo(() => {
        const isGlobalFeatureSystemDisabled = featureConfig.globalDefaults.defaultEnabled === false
        const productionNetworkIds = Object.values(SupportedChains).filter((id) => id)

        const activeNetworksByFeature: Record<string, SupportedChains[]> = {}

        for (const featureName of supportedFeatureKeys) {
            const globalFeatureDefault =
                featureConfig.globalDefaults[`default${featureName[0].toUpperCase()}${featureName.slice(1)}`]

            // Disable globally if system or feature default is off
            if (isGlobalFeatureSystemDisabled || globalFeatureDefault === false) {
                activeNetworksByFeature[featureName] = []
                continue
            }

            activeNetworksByFeature[featureName] = productionNetworkIds.filter((id) => {
                const chainOverrides = featureConfig.networks?.[id]
                return chainOverrides?.[featureName] === true
            })
        }

        return {
            isFeatureActive: (featureName: string, targetChainId?: SupportedChains | number): boolean =>
                isFeatureActive(activeNetworksByFeature, featureName, targetChainId),
            activeNetworksByFeature,
        }
    }, [featureConfig])

    return React.createElement(GoodDappFeatureContext.Provider, { value: contextValue }, children)
}

export const useGoodDappFeatures = (): FeatureContextValue => {
    const context = useContext(GoodDappFeatureContext)
    if (!context) {
        throw new Error('useGoodDappFeatures must be used inside a GoodDappFeatureProvider')
    }
    return context
}
