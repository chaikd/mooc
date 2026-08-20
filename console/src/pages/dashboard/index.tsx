import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
export default function Dashboard() {
  return(
    <>
      Dashboard
      <Accordion>
        <AccordionItem value="item-1">
          <AccordionTrigger>click me</AccordionTrigger>
          <AccordionContent>content content</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>i am item</AccordionTrigger>
          <AccordionContent>item 2 content</AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  )
}