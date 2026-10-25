/* eslint-env jest */

jest.mock(
    '@gooddollar/web3sdk-v2',
    () => ({
        SupportedChains: {
            MAINNET: 1,
            FUSE: 122,
            CELO: 42220,
            XDC: 50,
        },
    }),
    { virtual: true }
)

jest.mock(
    'posthog-react-native',
    () => ({
        useFeatureFlagWithPayload: jest.fn(() => [true, undefined]),
    }),
    { virtual: true }
)

import { SupportedChains } from '@gooddollar/web3sdk-v2'
import { getChainFeatures, isFeatureActive } from './useFeaturesEnabled'

describe('useFeaturesEnabled helpers', () => {
    const mockActiveNetworksByFeature: Record<string, SupportedChains[]> = {
        networkEnabled: [SupportedChains.CELO, SupportedChains.FUSE, SupportedChains.MAINNET],
        microBridgeEnabled: [SupportedChains.CELO, SupportedChains.FUSE],
        lzBridgeEnabled: [],
        reserveEnabled: [SupportedChains.CELO],
        claimEnabled: [SupportedChains.CELO, SupportedChains.FUSE],
        dexSwapEnabled: [SupportedChains.CELO],
        stakingEnabled: [],
        governanceEnabled: [SupportedChains.FUSE],
    }

    it('returns true when feature is enabled on the target chain', () => {
        expect(isFeatureActive(mockActiveNetworksByFeature, 'claimEnabled', SupportedChains.CELO)).toBe(true)
        expect(isFeatureActive(mockActiveNetworksByFeature, 'claimEnabled', '122')).toBe(true)
        expect(isFeatureActive(mockActiveNetworksByFeature, 'reserveEnabled', SupportedChains.CELO)).toBe(true)
    })

    it('returns false when feature is disabled on the target chain or chainId is missing', () => {
        expect(isFeatureActive(mockActiveNetworksByFeature, 'claimEnabled', SupportedChains.MAINNET)).toBe(false)
        expect(isFeatureActive(mockActiveNetworksByFeature, 'lzBridgeEnabled', SupportedChains.CELO)).toBe(false)
        expect(isFeatureActive(mockActiveNetworksByFeature, 'claimEnabled', undefined)).toBe(false)
        expect(isFeatureActive(mockActiveNetworksByFeature, 'claimEnabled', NaN)).toBe(false)
    })

    it('computes all chain features via getChainFeatures', () => {
        expect(getChainFeatures(mockActiveNetworksByFeature, SupportedChains.CELO)).toEqual({
            networkEnabled: true,
            microBridgeEnabled: true,
            lzBridgeEnabled: false,
            reserveEnabled: true,
            claimEnabled: true,
            dexSwapEnabled: true,
            stakingEnabled: false,
            governanceEnabled: false,
        })
    })
})
