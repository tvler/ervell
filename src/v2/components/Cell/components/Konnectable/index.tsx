import React, { useCallback, useState } from 'react'
import styled from 'styled-components'
import { height, width, space } from 'styled-system'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import { touch as isTouchDevice } from 'v2/util/is'

import { KonnectableCell as KonnectableCellData } from '__generated__/KonnectableCell'
import { Mode } from 'v2/components/Cell/components/Konnectable/types'

import { preset } from 'v2/styles/functions'
import constants from 'v2/styles/constants'

import Text from 'v2/components/UI/Text'
import { KonnectableDisplay } from 'v2/components/Cell/components/Konnectable/components/KonnectableDisplay'
import KonnectableMetadata from 'v2/components/Cell/components/Konnectable/components/KonnectableMetadata'
import KonnectableBlockOverlay from 'v2/components/Cell/components/Konnectable/components/KonnectableBlockOverlay'
import KonnectableChannelOverlay from 'v2/components/Cell/components/Konnectable/components/KonnectableChannelOverlay'
import useIsSpiderRequesting from 'v2/hooks/useIsSpiderRequesting'

import { getBreadcrumbPath } from 'v2/util/getBreadcrumbPath'
import BLOCK_QUERY from './queries/blokk'
import { Blokk, BlokkVariables } from '__generated__/Blokk'

const Container = styled(Link)`
  box-sizing: border-box;
  position: relative;
  display: block;
  text-decoration: none;
  background-color: ${props => props.theme.colors.background};
  user-select: none;
  ${preset(width, { width: constants.blockWidth })}
  ${preset(height, { height: constants.blockWidth })}
  ${preset(space, { mb: 8 })}
`

const Comments = styled(Text).attrs({
  mr: 6,
  mb: 6,
  px: 5,
  py: 3,
  f: 2,
})`
  position: absolute;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.colors.utility.translucent};
  z-index: 1;
  border-radius: ${constants.radii.subtle};
`

interface ContextProps {
  __typename: string
  id: number
}

interface Props {
  konnectable: KonnectableCellData
  context?: ContextProps[]
  isPreviewable?: boolean
  onOverlay?: () => any
  onOverlayClose?: () => any
  children?: React.ReactNode
}

interface InnerProps {
  location?: any
  isSpiderRequesting: boolean
}

export const KonnectableInner: React.FC<Props & InnerProps> = ({
  konnectable,
  isPreviewable = true,
  children,
  context,
  isSpiderRequesting,
  location,
  onOverlay: onOverlayCallback,
  onOverlayClose: onOverlayCloseCallback,
  ...rest
}) => {
  const [mode, setMode] = useState<Mode>(Mode.RESTING)

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (mode === Mode.OVERLAY) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [mode]
  )

  const onMouseEnter = useCallback(() => {
    if (mode === Mode.OVERLAY || isTouchDevice()) return
    setMode(Mode.HOVER)
  }, [mode])

  const onMouseLeave = useCallback(() => {
    if (mode === Mode.OVERLAY || isTouchDevice()) return
    setMode(Mode.RESTING)
  }, [mode])

  const onOverlay = useCallback(() => {
    setMode(Mode.OVERLAY)
    onOverlayCallback && onOverlayCallback()
  }, [onOverlayCallback])

  const onOverlayClose = useCallback(() => {
    setMode(Mode.HOVER)
    onOverlayCloseCallback && onOverlayCloseCallback()
  }, [onOverlayCloseCallback])

  const defaultToParams = {
    pathname: konnectable.href,
    state:
      konnectable.__typename === 'Channel' && getBreadcrumbPath(konnectable),
  }

  const toParams =
    konnectable.__typename === 'Channel' || isSpiderRequesting || !location
      ? defaultToParams
      : {
          ...defaultToParams,
          state: {
            background:
              mode !== Mode.OVERLAY ? JSON.stringify(location) : undefined,
            context,
          },
        }

  return (
    <Container
      to={toParams}
      role="button"
      aria-label={`Link to ${konnectable.__typename}: ${konnectable.title}`}
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-id={konnectable.id}
      data-no-instant={konnectable.__typename === 'Channel' ? undefined : true}
      {...rest}
    >
      {children && children}

      {konnectable.__typename !== 'Channel' &&
        konnectable.counts.comments > 0 &&
        mode !== Mode.OVERLAY && (
          <Comments>{konnectable.counts.comments}</Comments>
        )}

      <KonnectableDisplay mode={mode} konnectable={konnectable} />

      {konnectable.__typename !== 'Channel' && (
        <KonnectableMetadata mode={mode} konnectable={konnectable} />
      )}

      {konnectable.__typename !== 'Channel' && mode !== Mode.RESTING && (
        <KonnectableBlockOverlay
          konnectable={konnectable}
          onOverlay={onOverlay}
          onClose={onOverlayClose}
        />
      )}

      {konnectable.__typename === 'Channel' && mode !== Mode.RESTING && (
        <KonnectableChannelOverlay
          channel={konnectable}
          onOverlay={onOverlay}
          onClose={onOverlayClose}
          isPreviewable={isPreviewable}
        />
      )}
    </Container>
  )
}

export const Konnectable: React.FC<Props> = props => {
  const location = useLocation()
  const isSpiderRequesting = useIsSpiderRequesting()

  return (
    <KonnectableInner
      isSpiderRequesting={isSpiderRequesting}
      location={location}
      {...props}
    />
  )
}

interface BlockWithQueryProps {
  id: string
}

export const BlokkWithQuery: React.FC<BlockWithQueryProps> = ({
  id,
  ...rest
}) => {
  const location = useLocation()
  const { data, loading, error } = useQuery<Blokk, BlokkVariables>(
    BLOCK_QUERY,
    { variables: { id } }
  )

  if (loading || error) {
    return <Container />
  }

  return (
    <KonnectableInner
      konnectable={data.blokk}
      location={location}
      isPreviewable
      isSpiderRequesting={false}
      {...rest}
    />
  )
}
