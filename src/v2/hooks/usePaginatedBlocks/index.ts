import { DocumentNode, Reference, StoreObject, useQuery } from '@apollo/client'
import { useRef, useCallback, useMemo } from 'react'

import { ChannelContentsConnectable } from '__generated__/ChannelContentsConnectable'
import {
  moveConnectableMutationVariables,
  moveConnectableMutation as moveConnectableMutationData,
} from '__generated__/moveConnectableMutation'
import {
  BaseConnectableTypeEnum,
  ConnectableTypeEnum,
  SortDirection,
  Sorts,
} from '__generated__/globalTypes'
import {
  ChannelContentCount,
  ChannelContentCountVariables,
} from '__generated__/ChannelContentCount'

import moveConnectableMutation from 'v2/components/ChannelContents/mutations/moveConnectable'
import { getConnectableType } from 'v2/util/getConnectableType'

import { CHANNEL_CONTENT_COUNT } from './ChannelContentCount'

/**
 * The minimum required shape for the channel query
 */
interface RequiredChannelQueryData {
  channel: null | {
    __typename: 'Channel'
    id: number
    blokks: null | Array<{
      __typename: ChannelContentsConnectable['__typename']
      id: number
    } | null>
    counts: null | {
      __typename: 'ChannelCounts'
      contents: number | null
      blocks: number | null
      channels: number | null
    }
  }
}

/**
 * The minimum required shape for the channel query variables
 */
interface RequiredChannelQueryVariables {
  id: string
  page: number
  per: number
  sort?: Sorts | null
  direction?: SortDirection | null
  type?: ConnectableTypeEnum | null
  user_id?: string | null
}

/**
 * The minimum required shape for the block query
 */
interface RequiredBlockQueryData {
  blokk: null | {
    __typename: ChannelContentsConnectable['__typename']
    id: number
  }
}

/**
 * The minimum required shape for the block query variables
 */
interface RequiredBlockQueryVariables {
  id: string
}

/**
 * The base arguments for usePaginatedBlocks
 */
interface UsePaginatedBlocksBaseArgs {
  channelId: string
  channelQuery: DocumentNode
  per: number
  sort?: Sorts | null
  direction?: SortDirection | null
  type?: ConnectableTypeEnum | null
  user_id?: string | null
  ssr?: boolean
}

/**
 * The full arguments for usePaginatedBlocks
 */
interface UsePaginatedBlocksArgs extends UsePaginatedBlocksBaseArgs {
  blockquery: DocumentNode
}

/**
 * The contents of the blokks field
 */
type Block<ChannelQueryData extends RequiredChannelQueryData> =
  | NonNullable<NonNullable<ChannelQueryData['channel']>['blokks']>[number]
  | null

/**
 * A type that asserts the channel query and block query have
 * a matching blokk shape
 */
interface MatchingBlockQueryData<
  ChannelQueryData extends RequiredChannelQueryData
> extends RequiredBlockQueryData {
  blokk: Block<ChannelQueryData> | null
}

/**
 * The base return type for usePaginatedBlocks
 */
interface UsePaginatedBlocksBaseApi<
  ChannelQueryData extends RequiredChannelQueryData
> {
  blocks: Array<Block<ChannelQueryData>>
  contentCount: number
  getPage: (pageNumber: number) => void
  hasQueriedPage: (pageNumber: number) => boolean
  getPageFromIndex: (index: number) => number
  removeBlock: (args: { id: number; type: string }) => void
  moveBlock: (args: { oldIndex: number; newIndex: number }) => void
  addBlock: () => void
  getBlocksFromCache: () => Array<Block<ChannelQueryData>>
  loading: boolean
}

/**
 * The full return type for usePaginatedBlocks
 */
interface UsePaginatedBlocksApi<
  ChannelQueryData extends RequiredChannelQueryData
> extends UsePaginatedBlocksBaseApi<ChannelQueryData> {
  updateBlock: (args: {
    id: string
    type: BaseConnectableTypeEnum | false
  }) => Promise<void>
}

/**
 * The base overload of usePaginatedBlocks which doesn't support
 * the updateBlock function
 */
export function usePaginatedBlocks<
  ChannelQueryData extends RequiredChannelQueryData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ChannelQueryVariables extends RequiredChannelQueryVariables
>(
  unsafeArgs: UsePaginatedBlocksBaseArgs
): UsePaginatedBlocksBaseApi<ChannelQueryData>

/**
 * The full overload of usePaginatedBlocks
 */
export function usePaginatedBlocks<
  ChannelQueryData extends RequiredChannelQueryData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ChannelQueryVariables extends RequiredChannelQueryVariables,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BlockQueryData extends MatchingBlockQueryData<ChannelQueryData>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BlockQueryVariables extends RequiredBlockQueryVariables
>(unsafeArgs: UsePaginatedBlocksArgs): UsePaginatedBlocksApi<ChannelQueryData>

/**
 * A hook to easily work with a collection of blocks from a channel.
 * Returns the channel's blocks as well as utility methods to fetch more,
 * move blocks around, add blocks, and delete blocks.
 */
export function usePaginatedBlocks<
  ChannelQueryData extends RequiredChannelQueryData,
  ChannelQueryVariables extends RequiredChannelQueryVariables,
  BlockQueryData extends MatchingBlockQueryData<ChannelQueryData>,
  BlockQueryVariables extends RequiredBlockQueryVariables
>({
  channelQuery,
  channelId,
  per,
  sort,
  direction,
  ssr,
  type,
  user_id,
  blockquery,
}: UsePaginatedBlocksBaseArgs &
  Partial<UsePaginatedBlocksArgs>): UsePaginatedBlocksBaseApi<
  ChannelQueryData
> &
  Partial<UsePaginatedBlocksApi<ChannelQueryData>> {
  // =============================
  // "Private" fields of this hook
  // =============================

  /**
   * A set that keeps track of which pages have already been queried for
   */
  const queriedPageNumbersRef = useRef(new Set<number>())

  /**
   * A variable that stores all the identifiable information of
   * to the current query. If any of this data changes, reset
   * the queriedPageNumbersRef.
   */
  const channelQueryData: {
    query: DocumentNode
    variables: ChannelQueryVariables
  } = useMemo(() => {
    queriedPageNumbersRef.current = new Set()

    return {
      query: channelQuery,
      variables: {
        id: channelId,
        page: 1,
        per: per,
        sort: sort,
        direction: direction,
        type: type,
        user_id: user_id,
      } as ChannelQueryVariables,
    }
  }, [channelId, channelQuery, direction, per, sort, type, user_id])

  /**
   * The current blocks that we have for a channel
   */
  const { data: unsafeData, fetchMore, client, loading } = useQuery<
    ChannelQueryData,
    ChannelQueryVariables
  >(channelQueryData.query, {
    variables: channelQueryData.variables,
    ssr: ssr,
    context: { queryDeduplication: false },
  })

  /**
   * A function to get the currently cached query data. Useful if
   * you want to use this data in a memoized function without re-memoizing
   * every time the query data changes (which happens a lot)
   */
  const getQueryFromCache: () => ChannelQueryData | null = useCallback(() => {
    return client.readQuery<ChannelQueryData, ChannelQueryVariables>({
      query: channelQueryData.query,
      variables: channelQueryData.variables,
    })
  }, [client, channelQueryData])

  /**
   * A function that allows you to directly modify the channel's "blokks"
   * cache value. If the length of blokks changes, the channel.counts.contents
   * field will be updated to the new value.
   */
  const updateCache: (
    updater: (args: {
      prevBlocks: Array<Block<ChannelQueryData>> | null
      prevCount: number
    }) => {
      newBlocks?: Array<StoreObject | Reference | null>
      newCount?: number
    } | null
  ) => void = useCallback(
    updater => {
      client.cache.updateQuery<ChannelQueryData, ChannelQueryVariables>(
        {
          query: channelQueryData.query,
          variables: channelQueryData.variables,
        },
        data => {
          const prevBlocks = data?.channel?.blokks ?? null
          const prevCount = data?.channel?.counts?.contents ?? 0

          const newValues = updater({ prevBlocks, prevCount })

          if (!newValues) {
            return null
          }

          const result: ChannelQueryData = {
            ...data,
            channel: {
              ...data?.channel,
              counts: {
                ...data?.channel?.counts,
                contents: newValues.newCount ?? prevCount,
              },
              blokks: newValues.newBlocks ?? prevBlocks,
            },
          } as ChannelQueryData

          return result
        }
      )
    },
    [channelQueryData, client.cache]
  )

  /**
   * A helper function to re-query for pages that have already been
   * queried. This is used after a mutation updates the blocks array.
   */
  const revalidatePages = useCallback(
    (fromPage: number, toPage: number) => {
      const dir = toPage > fromPage ? 1 : -1
      for (let page = fromPage; page !== toPage + dir; page += dir) {
        if (queriedPageNumbersRef.current.has(page)) {
          fetchMore({
            variables: {
              page: page,
            },
          })
        }
      }
    },
    [fetchMore]
  )

  // =====================
  // The hook's public api
  // =====================

  /**
   * An array of blocks that apollo currently has cached
   */
  const blocks: UsePaginatedBlocksApi<ChannelQueryData>['blocks'] =
    unsafeData?.channel?.blokks ?? []

  /**
   * The total number of blocks/channels that a channel has. Note that this
   * could be different than the current length of the "blocks" array
   * due to not downloading all the block information from a channel
   */

  const { data } = useQuery<ChannelContentCount, ChannelContentCountVariables>(
    CHANNEL_CONTENT_COUNT,
    {
      fetchPolicy: 'cache-only',
      variables: {
        id: channelId,
        type: type,
        user_id: user_id,
      },
    }
  )

  const contentCount: UsePaginatedBlocksApi<ChannelQueryData>['contentCount'] =
    data?.channel?.counts?.contents ?? 0

  /**
   * Gets block data from a given page
   */
  const getPage: UsePaginatedBlocksApi<
    ChannelQueryData
  >['getPage'] = useCallback(
    pageNumber => {
      queriedPageNumbersRef.current.add(pageNumber)

      fetchMore({
        variables: {
          page: pageNumber,
        },
      })
    },
    [fetchMore]
  )

  /**
   * Returns if a given page has already been queried for or not
   */
  const hasQueriedPage: UsePaginatedBlocksApi<
    ChannelQueryData
  >['hasQueriedPage'] = useCallback(pageNember => {
    return queriedPageNumbersRef.current.has(pageNember)
  }, [])

  /**
   * Returns the page number that a block's index would be in
   */
  const getPageFromIndex: UsePaginatedBlocksApi<
    ChannelQueryData
  >['getPageFromIndex'] = useCallback(
    index => {
      return Math.floor(index / per) + 1
    },
    [per]
  )

  /**
   * Removes a block from a channel ONLY on the frontend. Does not do any
   * actual mutation/network request.
   */
  const removeBlock: UsePaginatedBlocksApi<
    ChannelQueryData
  >['removeBlock'] = useCallback(
    ({ id, type }) => {
      updateCache(({ prevBlocks, prevCount }) => {
        // Early exit if there aren't any blocks in the cache yet
        if (!prevBlocks) {
          return null
        }

        // Find the block in the blocks array
        const blockIndex = prevBlocks.findIndex(
          block => block && block.id === id && block.__typename === type
        )

        // Early exit if the block can't be found
        if (blockIndex === -1) {
          return null
        }

        // Build the new cache data
        const newCount = prevCount - 1
        const newBlocks = [...prevBlocks]
        newBlocks.splice(blockIndex, 1)

        // Revalidate pages between the block index that was removed and
        // the end of the blocks array
        revalidatePages(
          getPageFromIndex(blockIndex),
          getPageFromIndex(newCount - 1)
        )

        return {
          newBlocks: newBlocks,
          newCount: newCount,
        }
      })
    },
    [getPageFromIndex, revalidatePages, updateCache]
  )

  /**
   * Moves a block from an old index to a new index and triggers an
   * apollo mutation
   */
  const moveBlock: UsePaginatedBlocksApi<
    ChannelQueryData
  >['moveBlock'] = useCallback(
    ({ oldIndex, newIndex }) => {
      updateCache(({ prevBlocks, prevCount }) => {
        // Early exit if there aren't any blocks in the cache yet
        if (!prevBlocks) {
          return null
        }

        // Moving to the "bottom". Convert a -1 newIndex value to a
        // synonymous "count - 1" value that the mutation can understand
        if (newIndex === -1) {
          newIndex = prevCount - 1
        }

        // Get the block reference in the cache. Early exit if we can't
        // read it
        const block = prevBlocks[oldIndex]
        if (!block) {
          return null
        }

        // Get the id and typename from the cache. Early exit if we
        // cant read any of those values
        const id = block.id || undefined
        const typename = block.__typename || undefined
        if (id === undefined || typename === undefined) {
          return null
        }

        // Fire the mutation
        client.mutate<
          moveConnectableMutationData,
          moveConnectableMutationVariables
        >({
          mutation: moveConnectableMutation,
          variables: {
            channel_id: channelId,
            connectable: {
              id: id.toString(),
              type: getConnectableType(
                typename as ChannelContentsConnectable['__typename']
              ),
            },
            insert_at: prevCount - newIndex,
          },
        })

        // Return the updated cache of the blocks array
        const newBlocks: typeof prevBlocks = []
        for (let i = 0; i < Math.max(prevBlocks.length, newIndex + 1); i++) {
          newBlocks.push(prevBlocks[i] ?? null)
        }
        const [removed] = newBlocks.splice(oldIndex, 1)
        newBlocks.splice(newIndex, 0, removed)
        return { newBlocks }
      })
    },
    [channelId, client, updateCache]
  )

  /**
   * A helper function to pull the most recent block data from the cache,
   * instead of passing the blocks data in as a dependency that will change
   * whenever the blocks are mutated
   */
  const getBlocksFromCache: UsePaginatedBlocksApi<
    ChannelQueryData
  >['getBlocksFromCache'] = useCallback(() => {
    const cachedQuery = getQueryFromCache()

    return cachedQuery?.channel?.blokks ?? []
  }, [getQueryFromCache])

  /**
   * Refetch block and update cache
   */
  const updateBlock: UsePaginatedBlocksApi<
    ChannelQueryData
  >['updateBlock'] = useCallback(
    async ({ id, type }) => {
      if (!blockquery) {
        return
      }

      // No need to update a channel block, just return early
      if (type === BaseConnectableTypeEnum.CHANNEL) {
        return
      }

      // Refetch the block
      let block: BlockQueryData['blokk'] | null = null
      try {
        const result = await client.query<BlockQueryData, BlockQueryVariables>({
          query: blockquery,
          variables: {
            id: id.toString(),
          } as BlockQueryVariables,
          fetchPolicy: 'network-only',
        })

        block = result.data.blokk
      } catch {
        // do nothing
      }

      // Early exit if we can't find a block
      if (!block) {
        return
      }

      // Update the cache to replace the previous block with the new block
      updateCache(({ prevBlocks }) => {
        // Early exit if there aren't any blocks in the cache yet
        if (!prevBlocks) {
          return null
        }

        // Early exit if we can't find a block
        if (!block) {
          return null
        }

        // Find the block in the blocks array
        const blockIndex = prevBlocks.findIndex(b => {
          return b && b.id === parseInt(id, 10)
        })

        // Early exit if the block can't be found
        if (blockIndex === -1) {
          return null
        }

        // Build the new blocks array
        const newBlocks = prevBlocks.map((prevBlock, i) =>
          i === blockIndex ? block : prevBlock
        )

        return {
          newBlocks,
        }
      })
    },
    [blockquery, updateCache, client]
  )

  /**
   * Refetch query and wipe queriedPageNumbersRef
   */
  const addBlock: UsePaginatedBlocksApi<
    ChannelQueryData
  >['addBlock'] = useCallback(() => {
    queriedPageNumbersRef.current = new Set()
    client.refetchQueries({
      include: [channelQuery],
      optimistic: true,
    })
  }, [channelQuery, client])

  // ==============================
  // Build and return the final api
  // ==============================

  const api: UsePaginatedBlocksApi<ChannelQueryData> = {
    blocks,
    contentCount,
    getPage,
    hasQueriedPage,
    getPageFromIndex,
    moveBlock,
    removeBlock,
    addBlock,
    updateBlock,
    getBlocksFromCache,
    loading,
  }

  return api
}
