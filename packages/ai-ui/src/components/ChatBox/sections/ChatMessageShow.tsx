import { cx } from "../../../utils/cx";
import { isJSONString } from "../../../utils/json";
import {
    ChatMessage,
    MessageQuestionContent,
    MessageThinkingContent,
} from "../ChatBox";

export interface ChatMessageShowProps {
    message: ChatMessage;
    actionable: boolean;
    onSelected?: (v: string) => void;
}

function parseContent(content: unknown): unknown {
    if (typeof content !== "string" || !isJSONString(content)) {
        return content;
    }
    try {
        return JSON.parse(content);
    } catch {
        return content;
    }
}

function isQuestionContent(value: unknown): value is MessageQuestionContent {
    return (
        typeof value === "object"
        && value !== null
        && "question" in value
        && typeof value.question === "string"
        && value.question.length > 0
    );
}

function isThinkingContent(value: unknown): value is MessageThinkingContent {
    return (
        typeof value === "object"
        && value !== null
        && (
            "learning_node" in value
            || "mastery_state" in value
            || "content_info" in value
        )
    );
}

function toDisplayText(value: unknown): string {
    if (value == null) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "object") {
        const thinking = value as MessageThinkingContent;
        if (typeof thinking.content_info === "string") {
            return thinking.content_info;
        }
        if (thinking.learning_node) {
            return thinking.learning_node;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function QuestionContentView({ content, onSelected, actionable }: { 
    content: MessageQuestionContent;
    onSelected: ChatMessageShowProps['onSelected'];
    actionable: ChatMessageShowProps['actionable'] 
}){
        const selected = (value: string) => {
            onSelected?.(value);
        };
        return (
            <div>
                <div>{content.question}</div>
                {
                    content.options?.map((option, index) => (
                        <div
                            key={index}
                            className={cx(
                                "text-gray-600 text-sm",
                                actionable && "hover:text-blue-600 cursor-pointer"
                            )}
                            onClick={() => actionable && selected(option)}
                        >
                            · {option}
                        </div>
                    ))
                }
            </div>
        );
}

export default function ChatMessageShow(
    {
        message,
        actionable,
        onSelected,
    }: ChatMessageShowProps
) {
    const parseMessage = parseContent(message.content)
    if (message.role === "assistant" && isQuestionContent(parseMessage)) {
        return <QuestionContentView content={parseMessage} actionable={actionable} onSelected={onSelected} />
    }
    if (message.role === "thinking" && isThinkingContent(parseMessage)){
        return toDisplayText(parseMessage)
    }
    return <div>{toDisplayText(parseMessage)}</div>
}
