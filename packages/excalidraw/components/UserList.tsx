import "./UserList.scss";

import React from "react";
import clsx from "clsx";
import { Collaborator, SocketId } from "../types";
import { Tooltip } from "./Tooltip";
import { useExcalidrawActionManager } from "./App";
import { ActionManager } from "../actions/manager";

import * as Popover from "@radix-ui/react-popover";
import { Island } from "./Island";
import { searchIcon } from "./icons";
import { t } from "../i18n";
import { isShallowEqual } from "../utils";

const FIRST_N_AVATARS = 3;
const SHOW_COLLABORATORS_FILTER_AT = 8;

const ConditionalTooltipWrapper = ({
  shouldWrap,
  children,
  clientId,
  username,
}: {
  shouldWrap: boolean;
  children: React.ReactNode;
  username?: string | null;
  clientId: string;
}) =>
  shouldWrap ? (
    <Tooltip label={username || "Unknown user"} key={clientId}>
      {children}
    </Tooltip>
  ) : (
    <React.Fragment key={clientId}>{children}</React.Fragment>
  );

const renderCollaborator = ({
  actionManager,
  collaborator,
  clientId,
  withName = false,
  shouldWrapWithTooltip = false,
}: {
  actionManager: ActionManager;
  collaborator: Collaborator;
  clientId: string;
  withName?: boolean;
  shouldWrapWithTooltip?: boolean;
}) => {
  const avatarJSX = actionManager.renderAction("goToCollaborator", [
    clientId,
    collaborator,
    withName,
  ]);

  return (
    <ConditionalTooltipWrapper
      key={clientId}
      clientId={clientId}
      username={collaborator.username}
      shouldWrap={shouldWrapWithTooltip}
    >
      {avatarJSX}
    </ConditionalTooltipWrapper>
  );
};

type UserListUserObject = Pick<
  Collaborator,
  "avatarUrl" | "id" | "socketId" | "username"
>;

type UserListProps = {
  className?: string;
  mobile?: boolean;
  collaborators: Map<SocketId, UserListUserObject>;
};

const collaboratorComparatorKeys = [
  "avatarUrl",
  "id",
  "socketId",
  "username",
] as const;

export const UserList = React.memo(
  ({ className, mobile, collaborators }: UserListProps) => {
    const actionManager = useExcalidrawActionManager();

    const uniqueCollaboratorsMap = new Map<string, Collaborator>();

    collaborators.forEach((collaborator, socketId) => {
      uniqueCollaboratorsMap.set(
        // filter on user id, else fall back on unique socketId
        collaborator.id || socketId,
        { ...collaborator, socketId },
      );
    });

    // const uniqueCollaboratorsMap = sampleCollaborators;
    const uniqueCollaboratorsArray = Array.from(uniqueCollaboratorsMap).filter(
      ([_, collaborator]) => collaborator.username?.trim(),
    );

    const [searchTerm, setSearchTerm] = React.useState("");

    if (uniqueCollaboratorsArray.length === 0) {
      return null;
    }

    const searchTermNormalized = searchTerm.trim().toLowerCase();

    const filteredCollaborators = searchTermNormalized
      ? uniqueCollaboratorsArray.filter(([, collaborator]) =>
          collaborator.username?.toLowerCase().includes(searchTerm),
        )
      : uniqueCollaboratorsArray;

    const firstNCollaborators = uniqueCollaboratorsArray.slice(
      0,
      FIRST_N_AVATARS,
    );

    const firstNAvatarsJSX = firstNCollaborators.map(
      ([clientId, collaborator]) =>
        renderCollaborator({
          actionManager,
          collaborator,
          clientId,
          shouldWrapWithTooltip: true,
        }),
    );

    return mobile ? (
      <div className={clsx("UserList UserList_mobile", className)}>
        {uniqueCollaboratorsArray.map(([clientId, collaborator]) =>
          renderCollaborator({
            actionManager,
            collaborator,
            clientId,
            shouldWrapWithTooltip: true,
          }),
        )}
      </div>
    ) : (
      <div className={clsx("UserList", className)}>
        {firstNAvatarsJSX}

        {uniqueCollaboratorsArray.length > FIRST_N_AVATARS && (
          <Popover.Root
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setSearchTerm("");
              }
            }}
          >
            <Popover.Trigger className="UserList__more">
              +{uniqueCollaboratorsArray.length - FIRST_N_AVATARS}
            </Popover.Trigger>
            <Popover.Content
              style={{
                zIndex: 2,
                width: "12rem",
                textAlign: "left",
              }}
              align="end"
              sideOffset={10}
            >
              <Island style={{ overflow: "hidden" }}>
                {uniqueCollaboratorsArray.length >=
                  SHOW_COLLABORATORS_FILTER_AT && (
                  <div className="UserList__search-wrapper">
                    {searchIcon}
                    <input
                      className="UserList__search"
                      type="text"
                      placeholder={t("userList.search.placeholder")}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                      }}
                    />
                  </div>
                )}
                <div className="dropdown-menu UserList__collaborators">
                  {filteredCollaborators.length === 0 && (
                    <div className="UserList__collaborators__empty">
                      {t("userList.search.empty")}
                    </div>
                  )}
                  <div className="UserList__hint">
                    {t("userList.hint.text")}
                  </div>
                  {filteredCollaborators.map(([clientId, collaborator]) =>
                    renderCollaborator({
                      actionManager,
                      collaborator,
                      clientId,
                      withName: true,
                    }),
                  )}
                </div>
              </Island>
            </Popover.Content>
          </Popover.Root>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (
      prev.collaborators.size !== next.collaborators.size ||
      prev.mobile !== next.mobile ||
      prev.className !== next.className
    ) {
      return false;
    }

    for (const [socketId, collaborator] of prev.collaborators) {
      const nextCollaborator = next.collaborators.get(socketId);
      if (
        !nextCollaborator ||
        !isShallowEqual(
          collaborator,
          nextCollaborator,
          collaboratorComparatorKeys,
        )
      ) {
        return false;
      }
    }
    return true;
  },
);
