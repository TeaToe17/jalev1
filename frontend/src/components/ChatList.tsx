import { VariableSizeList as List, VariableSizeList } from "react-window";
import { useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface Message {
  text: string;
  sender_id: number | string | undefined;
  created_at: string;
  analyzing?: boolean;
  scope?: string;
  product_id?: number;
  owner_id?: number;
}

type Props = {
  messages: Message[];
  pendingMessages: Message[];
  currentUser: { id: string | number } | null;
};

export default function ChatList({
  messages,
  pendingMessages,
  currentUser,
}: Props) {
  const listRef = useRef<VariableSizeList | null>(null);
  const sizeMap = useRef<Record<number, number>>({});

  const allMessages = [...messages, ...pendingMessages];

  const setSize = useCallback((index: number, size: number) => {
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size;
      listRef.current?.resetAfterIndex(index, true);
    }
  }, []);

  const getSize = (index: number) => sizeMap.current[index] ?? 100;

  useEffect(() => {
    if (allMessages.length > 0) {
      listRef.current?.scrollToItem(allMessages.length - 1, "end");
    }
  }, [allMessages.length]);

  type RowProps = {
    index: number;
    style: React.CSSProperties;
  };

  const Row = ({ index, style }: RowProps) => {
    const msg = allMessages[index];
    const isPending = index >= messages.length;
    const isCurrentUser = currentUser && msg.sender_id === currentUser.id;

    const rowRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      if (rowRef.current) {
        requestAnimationFrame(() => {
          if (!rowRef.current) return;
          const height = rowRef.current.offsetHeight;
          setSize(index, height);
        });
      }
    }, [index, msg.text, msg.analyzing, setSize]);

    return (
      <div style={style} className="flex px-2">
        <div ref={rowRef} className="w-full">
          <motion.div
            key={isPending ? `pending-${index}` : `msg-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: isPending ? 0 : index * 0.05,
              duration: 0.3,
            }}
            className={`flex w-full ${
              isCurrentUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`min-w-0 max-w-[75%] overflow-hidden rounded-lg px-3 py-1 text-sm ${
                isCurrentUser
                  ? `bg-gradient-to-r from-[#fcecd8] ${
                      isPending ? "to-[#1c2b3a]/80" : "to-[#1c2b3a]"
                    } text-white`
                  : "bg-white border border-gray-200 text-gray-800"
              }`}
            >
              {!isCurrentUser && (
                <div className="font-semibold mb-0.5 text-xs">
                  {msg.sender_id === "system"
                    ? "System"
                    : `User #${msg.sender_id}`}
                </div>
              )}

              {isPending ? (
                <div className="break-all">{msg.text}</div>
              ) : (
                <div
                  className="break-all"
                  dangerouslySetInnerHTML={{
                    __html: msg.text,
                  }}
                />
              )}

              {msg.analyzing && (
                <div
                  className={`flex items-center gap-2 mt-0.5 ${
                    isCurrentUser ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  <Brain
                    size={12}
                    className={
                      isCurrentUser ? "text-white/80" : "text-[#1c2b3a]"
                    }
                  />
                  <div className="text-xs font-medium flex items-center">
                    Analyzing
                    <span className="ml-1 flex">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            delay,
                            times: [0, 0.5, 1],
                          }}
                          className="h-0.5 w-0.5 mx-0.5 rounded-full bg-current"
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {msg.created_at && (
                <div
                  className={`text-xs mt-0.5 ${
                    isCurrentUser ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {msg.created_at}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <List
      ref={listRef}
      height={500}
      width="100%"
      itemCount={allMessages.length}
      itemSize={getSize}
      overscanCount={5}
      className="scrollbar-hide"
    >
      {Row}
    </List>
  );
}
