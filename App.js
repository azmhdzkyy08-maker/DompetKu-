import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@dompetku_final_v1";

const CATEGORIES = [
  "Makanan",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Kesehatan",
  "Pendidikan",
  "Tabungan",
  "Gaji",
  "Bonus",
  "Lainnya",
];

const COLORS = {
  primary: "#111827",
  primary2: "#1f2937",
  green: "#16a34a",
  red: "#ef4444",
  blue: "#2563eb",
  orange: "#f59e0b",
  purple: "#7c3aed",
  lightBg: "#f5f6fa",
  white: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
};

function formatRupiah(value) {
  const number = Number(value) || 0;

  return "Rp" + number.toLocaleString("id-ID");
}

function parseMoney(text) {
  if (!text) return 0;

  const clean = String(text).replace(/[^0-9]/g, "");

  return Number(clean) || 0;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(dateString) {
  const date = new Date(dateString);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function AppLogo({ dark = false, large = false }) {
  return (
    <View style={large ? styles.logoLargeWrap : styles.logoWrap}>
      <View
        style={[
          styles.logoCoin,
          large && styles.logoCoinLarge,
        ]}
      >
        <Text style={large ? styles.logoIconLarge : styles.logoIcon}>
          $
        </Text>
      </View>

      <View>
        <Text
          style={[
            large ? styles.logoTitleLarge : styles.logoTitle,
            dark && { color: "#fff" },
          ]}
        >
          Dompet<Text style={{ color: "#2563eb" }}>Ku</Text>
        </Text>

        {large && (
          <Text style={styles.logoMini}>
            SMART MONEY
          </Text>
        )}
      </View>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);

  const [transactions, setTransactions] = useState([]);

  const [darkMode, setDarkMode] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Makanan");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString());

  const [search, setSearch] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const bg = darkMode ? "#0b1120" : COLORS.lightBg;
  const card = darkMode ? "#111827" : COLORS.white;
  const text = darkMode ? "#f9fafb" : COLORS.text;
  const muted = darkMode ? "#9ca3af" : COLORS.muted;
  const border = darkMode ? "#243044" : COLORS.border;

  useEffect(() => {
    loadData();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (showAdd) {
          closeForm();
          return true;
        }

        if (showSettings) {
          setShowSettings(false);
          return true;
        }

        if (showExit) {
          setShowExit(false);
          return true;
        }

        if (entered) {
          setShowExit(true);
          return true;
        }

        return false;
      }
    );

    return () => subscription.remove();
  }, [entered, showAdd, showSettings, showExit]);

  async function loadData() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
        }

        if (typeof parsed.darkMode === "boolean") {
          setDarkMode(parsed.darkMode);
        }
      }
    } catch (error) {
      console.log("Load error:", error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 700);
    }
  }

  async function saveData(newTransactions = transactions, newDarkMode = darkMode) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          transactions: newTransactions,
          darkMode: newDarkMode,
        })
      );
    } catch (error) {
      console.log("Save error:", error);
    }
  }

  function enterApp() {
    setEntered(true);
  }

  function resetForm() {
    setType("expense");
    setAmount("");
    setCategory("Makanan");
    setNote("");
    setDate(new Date().toISOString());
    setEditingId(null);
  }

  function openAddForm() {
    resetForm();
    setShowAdd(true);
  }

  function closeForm() {
    Keyboard.dismiss();
    setShowAdd(false);
    resetForm();
  }

  function openEdit(item) {
    setEditingId(item.id);
    setType(item.type);
    setAmount(String(item.amount));
    setCategory(item.category);
    setNote(item.note || "");
    setDate(item.date);
    setShowAdd(true);
  }

  async function saveTransaction() {
    Keyboard.dismiss();

    const numericAmount = parseMoney(amount);

    if (numericAmount <= 0) {
      Alert.alert("Nominal belum diisi", "Masukkan jumlah transaksi.");
      return;
    }

    const transaction = {
      id: editingId || Date.now().toString(),
      type,
      amount: numericAmount,
      category,
      note: note.trim(),
      date,
    };

    let newTransactions;

    if (editingId) {
      newTransactions = transactions.map((item) =>
        item.id === editingId ? transaction : item
      );
    } else {
      newTransactions = [
        transaction,
        ...transactions,
      ];
    }

    setTransactions(newTransactions);
    await saveData(newTransactions);

    closeForm();
  }

  function deleteTransaction(id) {
    Alert.alert(
      "Hapus transaksi?",
      "Transaksi ini akan dihapus dari riwayat.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            const newTransactions = transactions.filter(
              (item) => item.id !== id
            );

            setTransactions(newTransactions);
            await saveData(newTransactions);
          },
        },
      ]
    );
  }

  function clearAllTransactions() {
    if (transactions.length === 0) {
      Alert.alert("Belum ada transaksi.");
      return;
    }

    Alert.alert(
      "Hapus semua?",
      "Semua riwayat transaksi akan dihapus.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus Semua",
          style: "destructive",
          onPress: async () => {
            setTransactions([]);
            await saveData([]);
          },
        },
      ]
    );
  }

  async function toggleDarkMode() {
    const newValue = !darkMode;

    setDarkMode(newValue);
    await saveData(transactions, newValue);
  }

  const totalIncome = useMemo(() => {
    return transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [transactions]);

  const balance = totalIncome - totalExpense;

  const currentMonth = getCurrentMonthKey();

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(
      (item) => getMonthKey(item.date) === currentMonth
    );
  }, [transactions, currentMonth]);

  const monthlyIncome = monthlyTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const categoryStats = useMemo(() => {
    const result = {};

    monthlyTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        result[item.category] =
          (result[item.category] || 0) + item.amount;
      });

    return Object.entries(result)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [monthlyTransactions]);

  const maxCategoryValue =
    categoryStats.length > 0
      ? Math.max(...categoryStats.map((item) => item[1]))
      : 1;

  const filteredTransactions = transactions.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      item.category.toLowerCase().includes(keyword) ||
      (item.note || "").toLowerCase().includes(keyword) ||
      formatDate(item.date).toLowerCase().includes(keyword)
    );
  });

  function handleExit() {
    setShowExit(false);

    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      setEntered(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          { backgroundColor: "#0f172a" },
        ]}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: "center",
          }}
        >
          <AppLogo large dark />

          <Text style={styles.loadingText}>
            Mengatur dompetmu...
          </Text>

          <Text style={styles.versionText}>
            Dzaky Studio • V.1.0
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!entered) {
    return (
      <SafeAreaView
        style={[
          styles.homeContainer,
          { backgroundColor: "#0b1120" },
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0b1120"
        />

        <Animated.View
          style={[
            styles.homeContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.homeLogoCircle}>
            <Text style={styles.homeLogoMoney}>$</Text>
          </View>

          <Text style={styles.homeTitle}>
            Dompet<Text style={{ color: "#60a5fa" }}>Ku</Text>
          </Text>

          <Text style={styles.homeSlogan}>
            Atur uangmu,{"\n"}
            tanpa bikin pusing.
          </Text>

          <Text style={styles.homeDescription}>
            Catat pemasukan, pengeluaran,
            dan tabunganmu dengan lebih mudah.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.enterButton,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={enterApp}
          >
            <Text style={styles.enterButtonText}>
              Masuk
            </Text>

            <Text style={styles.enterArrow}>
              →
            </Text>
          </Pressable>

          <Text style={styles.studioText}>
            Dzaky Studio • V.1.0
          </Text>

          <Text style={styles.copyrightText}>
            Personal Finance App
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bg },
      ]}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: muted }]}>
              Selamat datang 👋
            </Text>

            <AppLogo />
          </View>

          <Pressable
            onPress={() => setShowSettings(true)}
            style={[
              styles.iconButton,
              {
                backgroundColor: card,
                borderColor: border,
              },
            ]}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </Pressable>
        </View>

        {/* BALANCE */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceGlow} />

          <Text style={styles.balanceLabel}>
            SALDO SAAT INI
          </Text>

          <Text style={styles.balanceValue}>
            {formatRupiah(balance)}
          </Text>

          <Text style={styles.balanceSmall}>
            {transactions.length} transaksi
          </Text>
        </View>

        {/* INCOME / EXPENSE */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: card,
                borderColor: border,
              },
            ]}
          >
            <Text style={styles.summaryIcon}>
              ↑
            </Text>

            <Text style={[styles.summaryLabel, { color: muted }]}>
              Pemasukan
            </Text>

            <Text
              style={[
                styles.summaryValue,
                { color: COLORS.green },
              ]}
            >
              {formatRupiah(totalIncome)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: card,
                borderColor: border,
              },
            ]}
          >
            <Text style={styles.summaryIcon}>
              ↓
            </Text>

            <Text style={[styles.summaryLabel, { color: muted }]}>
              Pengeluaran
            </Text>

            <Text
              style={[
                styles.summaryValue,
                { color: COLORS.red },
              ]}
            >
              {formatRupiah(totalExpense)}
            </Text>
          </View>
        </View>

        {/* ADD BUTTON */}
        <Pressable
          onPress={openAddForm}
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.addButtonText}>
            ＋ Tambah Transaksi
          </Text>
        </Pressable>

        {/* STATISTICS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: card,
              borderColor: border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: text }]}>
            Statistik Bulan Ini
          </Text>

          <Text style={[styles.sectionSubtitle, { color: muted }]}>
            Ringkasan keuangan bulan ini
          </Text>

          <View style={styles.monthStatsRow}>
            <View
              style={[
                styles.monthBox,
                {
                  backgroundColor: darkMode
                    ? "#172033"
                    : "#f5f7fb",
                },
              ]}
            >
              <Text style={[styles.monthLabel, { color: muted }]}>
                Masuk
              </Text>

              <Text
                style={[
                  styles.monthValue,
                  { color: COLORS.green },
                ]}
              >
                {formatRupiah(monthlyIncome)}
              </Text>
            </View>

            <View
              style={[
                styles.monthBox,
                {
                  backgroundColor: darkMode
                    ? "#172033"
                    : "#f5f7fb",
                },
              ]}
            >
              <Text style={[styles.monthLabel, { color: muted }]}>
                Keluar
              </Text>

              <Text
                style={[
                  styles.monthValue,
                  { color: COLORS.red },
                ]}
              >
                {formatRupiah(monthlyExpense)}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.chartTitle,
              { color: text },
            ]}
          >
            Pengeluaran berdasarkan kategori
          </Text>

          {categoryStats.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: muted }]}>
                Belum ada pengeluaran bulan ini.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              {categoryStats.map(([name, value]) => {
                const width =
                  (value / maxCategoryValue) * 100;

                return (
                  <View
                    key={name}
                    style={styles.chartItem}
                  >
                    <View style={styles.chartHeader}>
                      <Text
                        style={[
                          styles.chartCategory,
                          { color: text },
                        ]}
                      >
                        {name}
                      </Text>

                      <Text
                        style={[
                          styles.chartAmount,
                          { color: muted },
                        ]}
                      >
                        {formatRupiah(value)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.chartTrack,
                        {
                          backgroundColor: darkMode
                            ? "#263246"
                            : "#edf0f5",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.chartFill,
                          { width: `${width}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* HISTORY */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: card,
              borderColor: border,
            },
          ]}
        >
          <View style={styles.historyHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: text },
                ]}
              >
                Riwayat Transaksi
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: muted },
                ]}
              >
                Semua aktivitas keuangan
              </Text>
            </View>

            {transactions.length > 0 && (
              <Pressable onPress={clearAllTransactions}>
                <Text style={styles.deleteAll}>
                  Hapus Semua
                </Text>
              </Pressable>
            )}
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari transaksi..."
            placeholderTextColor={muted}
            style={[
              styles.searchInput,
              {
                backgroundColor: darkMode
                  ? "#172033"
                  : "#f8fafc",
                color: text,
                borderColor: border,
              },
            ]}
            returnKeyType="search"
          />

          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>
                🧾
              </Text>

              <Text
                style={[
                  styles.emptyHistoryTitle,
                  { color: text },
                ]}
              >
                Belum ada transaksi
              </Text>

              <Text
                style={[
                  styles.emptyHistoryText,
                  { color: muted },
                ]}
              >
                Tambahkan transaksi pertamamu.
              </Text>
            </View>
          ) : (
            filteredTransactions.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.transactionItem,
                  {
                    borderBottomColor: border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor:
                        item.type === "income"
                          ? "#dcfce7"
                          : "#fee2e2",
                    },
                  ]}
                >
                  <Text>
                    {item.type === "income"
                      ? "↑"
                      : "↓"}
                  </Text>
                </View>

                <View style={styles.transactionMiddle}>
                  <Text
                    style={[
                      styles.transactionCategory,
                      { color: text },
                    ]}
                  >
                    {item.category}
                  </Text>

                  <Text
                    style={[
                      styles.transactionNote,
                      { color: muted },
                    ]}
                    numberOfLines={1}
                  >
                    {item.note || "Tanpa catatan"}
                  </Text>

                  <Text
                    style={[
                      styles.transactionDate,
                      { color: muted },
                    ]}
                  >
                    {formatDate(item.date)}
                  </Text>
                </View>

                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          item.type === "income"
                            ? COLORS.green
                            : COLORS.red,
                      },
                    ]}
                  >
                    {item.type === "income"
                      ? "+"
                      : "-"}
                    {formatRupiah(item.amount)}
                  </Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => openEdit(item)}
                    >
                      <Text style={styles.editText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        deleteTransaction(item.id)
                      }
                    >
                      <Text style={styles.removeText}>
                        Hapus
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: muted }]}>
            DompetKu
          </Text>

          <Text style={[styles.footerText, { color: muted }]}>
            Dzaky Studio • V.1.0
          </Text>
        </View>
      </ScrollView>

      {/* ADD / EDIT MODAL */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : "height"
          }
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
          />

          <View
            style={[
              styles.formSheet,
              {
                backgroundColor: card,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.formHeader}>
              <View>
                <Text
                  style={[
                    styles.formTitle,
                    { color: text },
                  ]}
                >
                  {editingId
                    ? "Edit Transaksi"
                    : "Tambah Transaksi"}
                </Text>

                <Text
                  style={[
                    styles.formSubtitle,
                    { color: muted },
                  ]}
                >
                  Catat aktivitas keuanganmu
                </Text>
              </View>

              <Pressable onPress={closeForm}>
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {/* TYPE */}
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setType("income")}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      type === "income"
                        ? "#dcfce7"
                        : darkMode
                        ? "#172033"
                        : "#f5f6fa",
                    borderColor:
                      type === "income"
                        ? COLORS.green
                        : border,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>
                  ↑
                </Text>

                <Text
                  style={{
                    color:
                      type === "income"
                        ? COLORS.green
                        : muted,
                    fontWeight: "700",
                  }}
                >
                  Pemasukan
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setType("expense")}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      type === "expense"
                        ? "#fee2e2"
                        : darkMode
                        ? "#172033"
                        : "#f5f6fa",
                    borderColor:
                      type === "expense"
                        ? COLORS.red
                        : border,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>
                  ↓
                </Text>

                <Text
                  style={{
                    color:
                      type === "expense"
                        ? COLORS.red
                        : muted,
                    fontWeight: "700",
                  }}
                >
                  Pengeluaran
                </Text>
              </Pressable>
            </View>

            {/* AMOUNT */}
            <Text
              style={[
                styles.inputLabel,
                { color: text },
              ]}
            >
              Nominal
            </Text>

            <TextInput
              value={amount}
              onChangeText={(value) =>
                setAmount(
                  value.replace(/[^0-9]/g, "")
                )
              }
              placeholder="Contoh: 50000"
              placeholderTextColor={muted}
              keyboardType="numeric"
              style={[
                styles.amountInput,
                {
                  backgroundColor: darkMode
                    ? "#172033"
                    : "#f8fafc",
                  color: text,
                  borderColor: border,
                },
              ]}
              autoFocus={false}
            />

            {/* CATEGORY */}
            <Text
              style={[
                styles.inputLabel,
                { color: text },
              ]}
            >
              Kategori
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.categoryScroll}
            >
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor:
                        category === item
                          ? COLORS.primary
                          : darkMode
                          ? "#172033"
                          : "#f5f6fa",
                      borderColor:
                        category === item
                          ? COLORS.primary
                          : border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        category === item
                          ? "#fff"
                          : text,
                      fontWeight: "600",
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* NOTE */}
            <Text
              style={[
                styles.inputLabel,
                { color: text },
              ]}
            >
              Catatan
            </Text>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Contoh: makan siang, bensin, nabung..."
              placeholderTextColor={muted}
              style={[
                styles.noteInput,
                {
                  backgroundColor: darkMode
                    ? "#172033"
                    : "#f8fafc",
                  color: text,
                  borderColor: border,
                },
              ]}
              multiline
              textAlignVertical="top"
              blurOnSubmit={false}
              returnKeyType="default"
            />

            <View style={styles.formButtons}>
              <Pressable
                onPress={closeForm}
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: darkMode
                      ? "#172033"
                      : "#f3f4f6",
                  },
                ]}
              >
                <Text
                  style={{
                    color: text,
                    fontWeight: "700",
                  }}
                >
                  Batal
                </Text>
              </Pressable>

              <Pressable
                onPress={saveTransaction}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? "Simpan" : "Tambah"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SETTINGS */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.settingsBox,
              {
                backgroundColor: card,
              },
            ]}
          >
            <View style={styles.settingsHeader}>
              <Text
                style={[
                  styles.formTitle,
                  { color: text },
                ]}
              >
                Pengaturan
              </Text>

              <Pressable
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.settingRow,
                { borderBottomColor: border },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: text },
                  ]}
                >
                  Mode Gelap
                </Text>

                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: muted },
                  ]}
                >
                  Ubah tampilan aplikasi
                </Text>
              </View>

              <Pressable
                onPress={toggleDarkMode}
                style={[
                  styles.switch,
                  {
                    backgroundColor: darkMode
                      ? COLORS.blue
                      : "#d1d5db",
                  },
                ]}
              >
                <View
                  style={[
                    styles.switchCircle,
                    {
                      transform: [
                        {
                          translateX: darkMode
                            ? 20
                            : 0,
                        },
                      ],
                    },
                  ]}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.aboutBox,
                {
                  backgroundColor: darkMode
                    ? "#172033"
                    : "#f8fafc",
                },
              ]}
            >
              <AppLogo />

              <Text
                style={[
                  styles.aboutText,
                  { color: muted },
                ]}
              >
                Atur uangmu, tanpa bikin pusing.
              </Text>

              <Text
                style={[
                  styles.aboutVersion,
                  { color: text },
                ]}
              >
                Dzaky Studio • V.1.0
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setShowSettings(false);
                setTimeout(
                  () => setShowExit(true),
                  250
                );
              }}
              style={styles.exitButton}
            >
              <Text style={styles.exitButtonText}>
                🚪 Keluar Aplikasi
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* EXIT CONFIRMATION */}
      <Modal
        visible={showExit}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExit(false)}
      >
        <View style={styles.exitOverlay}>
          <View
            style={[
              styles.exitBox,
              {
                backgroundColor: card,
              },
            ]}
          >
            <View style={styles.exitIcon}>
              <Text style={{ fontSize: 28 }}>
                🚪
              </Text>
            </View>

            <Text
              style={[
                styles.exitTitle,
                { color: text },
              ]}
            >
              Keluar Aplikasi
            </Text>

            <Text
              style={[
                styles.exitMessage,
                { color: muted },
              ]}
            >
              Apakah anda ingin keluar dari
              aplikasi dompetku?
            </Text>

            <View style={styles.exitButtons}>
              <Pressable
                onPress={() => setShowExit(false)}
                style={[
                  styles.laterButton,
                  {
                    backgroundColor: darkMode
                      ? "#172033"
                      : "#f3f4f6",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.laterText,
                    { color: text },
                  ]}
                >
                  Nanti
                </Text>
              </Pressable>

              <Pressable
                onPress={handleExit}
                style={styles.yesButton}
              >
                <Text style={styles.yesText}>
                  Ya
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#cbd5e1",
    marginTop: 25,
    fontSize: 15,
  },

  versionText: {
    color: "#64748b",
    marginTop: 10,
    fontSize: 12,
  },

  homeContainer: {
    flex: 1,
  },

  homeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  homeLogoCircle: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 10,
  },

  homeLogoMoney: {
    color: "#fff",
    fontSize: 58,
    fontWeight: "900",
    transform: [{ rotate: "8deg" }],
  },

  homeTitle: {
    color: "#fff",
    fontSize: 45,
    fontWeight: "900",
    marginTop: 28,
    letterSpacing: -2,
  },

  homeSlogan: {
    color: "#e2e8f0",
    fontSize: 21,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 30,
    marginTop: 10,
  },

  homeDescription: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 16,
    maxWidth: 310,
  },

  enterButton: {
    marginTop: 35,
    width: "100%",
    maxWidth: 330,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  enterButtonText: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },

  enterArrow: {
    color: "#2563eb",
    fontSize: 23,
    fontWeight: "900",
    marginLeft: 10,
  },

  studioText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 28,
    fontWeight: "700",
  },

  copyrightText: {
    color: "#475569",
    fontSize: 10,
    marginTop: 5,
  },

  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  logoLargeWrap: {
    alignItems: "center",
  },

  logoCoin: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    transform: [{ rotate: "-8deg" }],
  },

  logoCoinLarge: {
    width: 75,
    height: 75,
    borderRadius: 24,
    marginRight: 0,
  },

  logoIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    transform: [{ rotate: "8deg" }],
  },

  logoIconLarge: {
    color: "#fff",
    fontSize: 45,
    fontWeight: "900",
    transform: [{ rotate: "8deg" }],
  },

  logoTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -1,
  },

  logoTitleLarge: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    marginTop: 16,
  },

  logoMini: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 3,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 15,
    marginBottom: 20,
  },

  greeting: {
    fontSize: 12,
    marginBottom: 4,
  },

  iconButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: {
    fontSize: 20,
  },

  balanceCard: {
    backgroundColor: "#111827",
    borderRadius: 25,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
  },

  balanceGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 100,
    backgroundColor: "#1d4ed8",
    opacity: 0.15,
    top: -80,
    right: -50,
  },

  balanceLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },

  balanceValue: {
    color: "#fff",
    fontSize: 35,
    fontWeight: "900",
    marginTop: 10,
  },

  balanceSmall: {
    color: "#94a3b8",
    marginTop: 8,
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
  },

  summaryIcon: {
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 12,
    marginBottom: 5,
  },

  summaryValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  addButton: {
    height: 57,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginTop: 15,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 5,
  },

  monthStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 17,
  },

  monthBox: {
    flex: 1,
    padding: 14,
    borderRadius: 15,
  },

  monthLabel: {
    fontSize: 11,
  },

  monthValue: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },

  chartTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 25,
  },

  emptyChart: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 13,
  },

  chartItem: {
    marginBottom: 13,
  },

  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  chartCategory: {
    fontSize: 12,
    fontWeight: "700",
  },

  chartAmount: {
    fontSize: 11,
  },

  chartTrack: {
    height: 7,
    borderRadius: 10,
    overflow: "hidden",
  },

  chartFill: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#2563eb",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  deleteAll: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "800",
  },

  searchInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    marginTop: 17,
    fontSize: 14,
  },

  emptyHistory: {
    alignItems: "center",
    paddingVertical: 35,
  },

  emptyHistoryIcon: {
    fontSize: 35,
  },

  emptyHistoryTitle: {
    fontWeight: "800",
    fontSize: 15,
    marginTop: 10,
  },

  emptyHistoryText: {
    fontSize: 12,
    marginTop: 4,
  },

  transactionItem: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },

  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  transactionMiddle: {
    flex: 1,
  },

  transactionCategory: {
    fontSize: 14,
    fontWeight: "800",
  },

  transactionNote: {
    fontSize: 11,
    marginTop: 3,
  },

  transactionDate: {
    fontSize: 10,
    marginTop: 4,
  },

  transactionRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  transactionAmount: {
    fontSize: 12,
    fontWeight: "900",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  editText: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "800",
  },

  removeText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "800",
  },

  footer: {
    alignItems: "center",
    paddingTop: 25,
  },

  footerText: {
    fontSize: 10,
    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },

  formSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "92%",
  },

  sheetHandle: {
    width: 45,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 18,
  },

  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  formTitle: {
    fontSize: 21,
    fontWeight: "900",
  },

  formSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  closeButton: {
    fontSize: 21,
    color: "#64748b",
    padding: 5,
  },

  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },

  typeButton: {
    flex: 1,
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  amountInput: {
    height: 55,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 15,
  },

  categoryScroll: {
    marginBottom: 15,
  },

  categoryButton: {
    paddingHorizontal: 13,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    marginRight: 8,
  },

  noteInput: {
    minHeight: 75,
    maxHeight: 100,
    borderRadius: 15,
    borderWidth: 1,
    padding: 13,
    fontSize: 13,
    marginBottom: 15,
  },

  formButtons: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 53,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButton: {
    flex: 1.5,
    height: 53,
    borderRadius: 15,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  settingsBox: {
    margin: 20,
    borderRadius: 25,
    padding: 20,
    marginTop: "auto",
    marginBottom: "auto",
  },

  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    borderBottomWidth: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  settingSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },

  switch: {
    width: 48,
    height: 28,
    borderRadius: 20,
    padding: 4,
    justifyContent: "center",
  },

  switchCircle: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
  },

  aboutBox: {
    borderRadius: 17,
    padding: 15,
    marginTop: 18,
  },

  aboutText: {
    fontSize: 11,
    marginTop: 10,
  },

  aboutVersion: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },

  exitButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  exitButtonText: {
    color: "#dc2626",
    fontWeight: "800",
  },

  exitOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },

  exitBox: {
    width: "100%",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
  },

  exitIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  exitTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  exitMessage: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },

  exitButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  laterButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  laterText: {
    fontWeight: "800",
  },

  yesButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },

  yesText: {
    color: "#fff",
    fontWeight: "800",
  },
});