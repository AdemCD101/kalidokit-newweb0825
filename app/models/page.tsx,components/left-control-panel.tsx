"use client"
import { Card, CardContent } from "@mui/material"
import ModelCard from "@/components/model-card"
import { models } from "@/data/models"

const Page = () => {
  return (
    <Card>
      <CardContent>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              size="large"
              onClick={() => {
                console.log("select model:", m.id)
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default Page

// components/left-control-panel.tsx
import { useMemo } from "react"
import { models } from "@/data/models"
import { List, ListItem, ListItemText } from "@mui/material"

const LeftControlPanel = ({ selectedModelId, setSelectedModelId }) => {
  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId) ?? null, [selectedModelId])

  return (
    <List>
      {models.map((m) => (
        <ListItem key={m.id} button selected={m.id === selectedModelId} onClick={() => setSelectedModelId(m.id)}>
          <ListItemText primary={m.name} />
        </ListItem>
      ))}
    </List>
  )
}

export default LeftControlPanel;
